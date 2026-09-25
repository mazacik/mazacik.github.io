import { upgradeEquipmentTypes } from '../services/equipment-types';
import { always, copy, Effect, newScene, newUnlockMethod, resolveEquipment, variableKey } from '../models/story.model';
import { applyEffect, attemptPlayerUnlock, changePlayerEquipment, check, choose, initialState, startGame, unlockAttemptReason } from './story-engine';
import { equippedCopy, unlockMethods } from './story-locks';
import { locksFixture, dispelMethod } from './story-locks-fixture';
import { inventoryRows, quantity } from './story-inventory';
import { validateStory, incomingReferences } from './story-validation';
import { playableFingerprint } from './story-order';
import { parseDocument } from '../services/story-document';

describe('Equipment locks and transactional unlock attempts', () => {
  const effect = (kind: Effect['kind'], target = 'dagger-1', actor = 'player'): Effect => ({ kind, target, actor, value: '', ignoreLayering: true });
  it('lets the player lock reachable equipped copies without automatic locking, transactionally', () => {
    const story = locksFixture();
    story.entities.find((e) => e.id === 'dagger').lockOnEquip = false;
    story.copies[0].locked = false;
    const original = startGame(story, 'Play'),
      before = copy(original),
      authored = copy(story);
    const next = changePlayerEquipment(story, original, 'dagger-1', 'lock');
    expect(next.state.copyStates['dagger-1'].locked).toBeTrue();
    expect(equippedCopy(next.state, 'dagger-1')).toBeTrue();
    expect(next.trace.at(-1)).toBe('Lock: Guard handcuffs');
    expect(next.transcript.at(-1).kind).toBe('equipmentAction');
    expect(next.transcript.at(-1).parts[0].text).toBe('Locked Guard handcuffs.');
    expect(() => changePlayerEquipment(story, next, 'dagger-1', false)).toThrowError(/Locked/);
    expect(() => changePlayerEquipment(story, original, 'dagger-2', 'lock')).toThrowError(/equipped/);
    expect(() => changePlayerEquipment(story, original, 'Helmet-copy', 'lock')).toThrowError(/lockable/);
    const foreign = copy(original);
    foreign.state.copyStates['dagger-1'].owner = 'npc';
    expect(() => changePlayerEquipment(story, foreign, 'dagger-1', 'lock')).toThrowError(/owns/);
    const broken = copy(original);
    broken.state.copyStates['dagger-1'].condition = 'broken';
    expect(() => changePlayerEquipment(story, broken, 'dagger-1', 'lock')).toThrowError(/intact/);
    expect(original).toEqual(before);
    expect(story).toEqual(authored);
    story.layerCoverage = { Armour: ['Shirt'] };
    expect(() => changePlayerEquipment(story, original, 'dagger-1', 'lock')).toThrowError(/Armour/);
    expect(original).toEqual(before);
    story.revision++;
    expect(() => changePlayerEquipment(story, original, 'dagger-1', 'lock')).toThrowError(/no longer active/);
  });
  it('permits locks only on equipped lockable copies and applies automatic locking after equip', () => {
    const story = locksFixture(),
      state = initialState(story);
    expect(state.copyStates['dagger-1'].locked).toBeTrue();
    expect(state.copyStates['dagger-2'].locked).toBeUndefined();
    expect(() => applyEffect(story, state, effect('lockEquipment', 'dagger-2'))).toThrowError(/equipped/);
    expect(() => applyEffect(story, state, effect('lockEquipment', 'Helmet-copy'))).toThrowError(/lockable/);
    applyEffect(story, state, effect('unlockEquipment'));
    applyEffect(story, state, effect('unequip'));
    story.entities.find((e) => e.id === 'dagger').lockOnEquip = true;
    applyEffect(story, state, effect('equip', 'dagger-2'));
    expect(state.copyStates['dagger-2'].locked).toBeTrue();
    expect(state.copyStates['dagger-1'].locked).toBeFalse();
    story.copies[0].locked = false;
    expect(initialState(story).copyStates['dagger-1'].locked).toBeUndefined();
    story.copies[1].locked = true;
    expect(() => initialState(story)).toThrowError(/start locked/);
  });
  it('prevents ordinary removal, replacement, confiscation and transfer even with a layer override', () => {
    const story = locksFixture(),
      state = initialState(story),
      before = copy(state);
    for (const action of [effect('unequip'), effect('equip', 'dagger-2'), effect('removeEquipment'), { ...effect('transferEquipment', 'dagger-1', 'npc'), from: 'player' }]) {
      expect(() => applyEffect(story, state, action)).toThrowError(/Locked/);
      expect(state).toEqual(before);
    }
    expect(() => changePlayerEquipment(story, startGame(story, 'Play'), 'dagger-1', false)).toThrowError(/Locked/);
  });
  it('accepts any matching key without consuming it and respects each copy override', () => {
    const story = locksFixture(),
      game = startGame(story, 'Play');
    story.entities.find((e) => e.id === 'dagger').keyItems = ['missing-for-this-test', 'apple'];
    const next = attemptPlayerUnlock(story, game, 'dagger-1', 'key-method');
    expect(equippedCopy(next.state, 'dagger-1')).toBeFalse();
    expect(next.state.copyStates['dagger-1'].locked).toBeFalse();
    expect(quantity(next.state, 'player', 'apple')).toBe(quantity(game.state, 'player', 'apple'));
    story.copies[0].keyItems = [];
    expect(unlockAttemptReason(story, game.state, 'dagger-1', 'key-method', 'player')).toContain('matching key');
    expect(() => attemptPlayerUnlock(story, game, 'dagger-1', 'key-method')).toThrowError(/matching key/);
    expect(game.state.copyStates['dagger-1'].locked).toBeTrue();
  });
  it('disables unavailable methods before costs or randomness are used', () => {
    const story = locksFixture(),
      method = dispelMethod();
    method.available = { ...always(), kind: 'flag', actor: '', target: 'alert' };
    method.explanation = 'A sharp object is not available.';
    story.entities.find((e) => e.id === 'dagger').unlockMethods.push(method);
    const game = startGame(story, 'Play'),
      before = copy(game),
      random = jasmine.createSpy().and.returnValue(0);
    expect(() => attemptPlayerUnlock(story, game, 'dagger-1', method.id, random)).toThrowError(/sharp object/);
    expect(game).toEqual(before);
    expect(random).not.toHaveBeenCalled();
  });
  it('checks success before spending magic, binds actor variables, and saves ordinary failure consequences', () => {
    const story = locksFixture(),
      method = dispelMethod();
    method.chance = 50;
    story.entities.find((e) => e.id === 'dagger').unlockMethods.push(method);
    const game = startGame(story, 'Play');
    const failure = attemptPlayerUnlock(story, game, 'dagger-1', method.id, () => 0.8);
    expect(failure.state.characterValues['player']['magic']).toBe(0);
    expect(failure.state.storyValues['alert']).toBeTrue();
    expect(failure.state.copyStates['dagger-1'].locked).toBeTrue();
    expect(failure.transcript.at(-1).attempt.succeeded).toBeFalse();
    expect(failure.transcript.at(-1).parts[0].text).toContain('guard');
    const success = attemptPlayerUnlock(story, game, 'dagger-1', method.id, () => 0.2);
    expect(success.state.characterValues['player']['magic']).toBe(0);
    expect(success.state.characterValues['npc']['magic']).toBe(20);
    expect(success.state.copyStates['dagger-1'].locked).toBeFalse();
    expect(game.state.characterValues['player']['magic']).toBe(20);
  });
  it('runs dialogue assistance with the wizard as actor and wearer/copy context bound separately', () => {
    const story = locksFixture(),
      method = dispelMethod(),
      choice = story.scenes[0].passages[0].choices[0];
    method.yes = [
      { id: 'wearer', kind: 'effect', effect: { kind: 'add', actor: '', target: variableKey('character', '@wearer', 'magic'), value: 1 } },
      { id: 'copy', kind: 'effect', effect: { kind: 'add', actor: '', target: variableKey('copy', '@equipment', 'durability'), value: -5 } },
    ];
    story.entities.find((e) => e.id === 'dagger').unlockMethods.push(method);
    choice.available = always();
    choice.steps = [
      { id: 'wizard', kind: 'unlock', target: 'dagger-1', method: method.id, actor: 'npc' },
      { id: 'end', kind: 'end' },
    ];
    expect(validateStory(story)).toEqual([]);
    const next = choose(story, startGame(story, 'Play'), choice.id);
    expect(next.state.characterValues['npc']['magic']).toBe(0);
    expect(next.state.characterValues['player']['magic']).toBe(21);
    expect(next.state.copyStates['dagger-1'].values['durability']).toBe(95);
    expect(next.state.copyStates['dagger-2'].values['durability']).toBe(100);
    expect(next.transcript.at(-1).attempt.actor).toBe('npc');
    expect(next.transcript.at(-1).speaker).toBe(story.entities.find((entity) => entity.id === 'npc').name);
    expect(next.transcript.at(-1).action).toBe(method.label + ': Guard handcuffs');
  });
  it('allows direct scripted unlocking followed by removal and independently authored costs', () => {
    const story = locksFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    choice.available = always();
    choice.steps = [
      { id: 'unlock', kind: 'effect', effect: effect('unlockEquipment') },
      { id: 'take', kind: 'effect', effect: effect('removeEquipment') },
      { id: 'end', kind: 'end' },
    ];
    expect(validateStory(story)).toEqual([]);
    expect(choose(story, startGame(story, 'Play'), choice.id).state.copyStates['dagger-1'].owner).toBe('');
  });
  it('checks the helper inventory for keys instead of silently using the wearer key', () => {
    const story = locksFixture(),
      state = initialState(story);
    state.quantities['npc'] = {};
    expect(unlockAttemptReason(story, state, 'dagger-1', 'key-method', 'npc')).toContain('matching key');
    state.quantities['npc']['apple'] = 1;
    expect(unlockAttemptReason(story, state, 'dagger-1', 'key-method', 'npc')).toBe('');
  });
  it('respects coverage by default and lets a method bypass it for its success result', () => {
    const story = locksFixture(),
      method = story.entities.find((e) => e.id === 'dagger').unlockMethods[0];
    story.layerCoverage = { Armour: ['Shirt'] };
    const game = startGame(story, 'Play');
    expect(() => attemptPlayerUnlock(story, game, 'dagger-1', method.id)).toThrowError(/Armour/);
    method.requiresAccess = false;
    const next = attemptPlayerUnlock(story, game, 'dagger-1', method.id);
    expect(next.state.equipment['player']['Armour']).toBe('Armour-copy');
    expect(equippedCopy(next.state, 'dagger-1')).toBeFalse();
  });
  it('can unlock without removing, break for later repair, or destroy permanently', () => {
    for (const result of ['unlock', 'break', 'destroy'] as const) {
      const story = locksFixture(),
        method = story.entities.find((e) => e.id === 'dagger').unlockMethods[0];
      method.result = result;
      const next = attemptPlayerUnlock(story, startGame(story, 'Play'), 'dagger-1', method.id),
        state = next.state;
      expect(state.copyStates['dagger-1'].locked).toBeFalse();
      expect(equippedCopy(state, 'dagger-1')).toBe(result === 'unlock');
      if (result === 'unlock') continue;
      expect(() => applyEffect(story, state, effect('equip'))).toThrowError(/Broken or destroyed/);
      if (result === 'break') {
        expect(inventoryRows(story, state, 'player').some((e) => e.id === 'dagger-1')).toBeTrue();
        applyEffect(story, state, effect('repairEquipment'));
        applyEffect(story, state, effect('equip'));
        expect(state.copyStates['dagger-1'].values['durability']).toBe(100);
      } else {
        expect(inventoryRows(story, state, 'player').some((e) => e.id === 'dagger-1')).toBeFalse();
        expect(state.copyStates['dagger-1'].owner).toBe('');
        expect(() => applyEffect(story, state, effect('repairEquipment'))).toThrowError(/destroyed/);
        expect(() => applyEffect(story, state, effect('giveEquipment'))).toThrow();
      }
      expect(check({ ...always(), kind: 'destroyed', target: 'dagger-1' }, state, story)).toBe(result === 'destroy');
    }
  });
  it('rolls back the entire attempt and dialogue choice on invalid effects or random draws', () => {
    const story = locksFixture(),
      method = dispelMethod();
    method.chance = 50;
    method.yes = [{ id: 'invalid', kind: 'effect', effect: { kind: 'removeQuantity', actor: '@actor', target: 'apple', value: 999 } }];
    story.entities.find((e) => e.id === 'dagger').unlockMethods.push(method);
    const game = startGame(story, 'Play'),
      before = copy(game);
    expect(() => attemptPlayerUnlock(story, game, 'dagger-1', method.id, () => 0)).toThrowError(/Not enough/);
    expect(() => attemptPlayerUnlock(story, game, 'dagger-1', method.id, () => 1)).toThrowError(/random draw/);
    expect(game).toEqual(before);
    const choice = story.scenes[0].passages[0].choices[0];
    choice.available = always();
    choice.steps = [
      { id: 'noise', kind: 'effect', effect: { kind: 'addFlag', actor: '', target: 'alert', value: '' } },
      { id: 'attempt', kind: 'unlock', actor: 'player', target: 'dagger-1', method: method.id },
      { id: 'end', kind: 'end' },
    ];
    expect(() => choose(story, game, choice.id, () => 0)).toThrow();
    expect(game).toEqual(before);
  });
  it('allows attempt outcomes to navigate and preserves history/choice association', () => {
    const story = locksFixture(),
      method = story.entities.find((e) => e.id === 'dagger').unlockMethods[0];
    method.result = 'unlock';
    const game = startGame(story, 'Play'),
      next = attemptPlayerUnlock(story, game, 'dagger-1', method.id);
    const choice = story.scenes[0].passages[0].choices[0];
    choice.available = always();
    choice.steps = [{ id: 'end', kind: 'end' }];
    const ended = choose(story, next, choice.id);
    expect(ended.transcript[0].choice).toBe(choice.label);
    expect(ended.transcript[1].choice).toBeUndefined();
    const scene = newScene();
    story.scenes.push(scene);
    method.yes = [{ id: 'jump', kind: 'go', scene: scene.id, passage: '' }];
    const moved = attemptPlayerUnlock(story, game, 'dagger-1', method.id);
    expect(moved.scene).toBe(scene.id);
    expect(moved.transcript.at(-2).kind).toBe('equipmentAttempt');
    expect(moved.transcript.at(-1).passage).toBe(scene.entry);
  });
  it('validates recursive methods, terminal costs, invalid checks, key references and probability', () => {
    const story = locksFixture(),
      method = story.entities.find((e) => e.id === 'dagger').unlockMethods[0];
    method.costs = [{ id: 'go', kind: 'end' }];
    method.no = [{ id: 'recurse', kind: 'unlock', target: 'dagger-1', actor: 'player', method: method.id }];
    method.chance = 101;
    method.success = { ...always(), kind: 'property', target: variableKey('copy', '@equipment', 'missing'), value: 0 };
    story.copies[0].keyItems = ['missing'];
    const messages = validateStory(story)
      .map((i) => i.message)
      .join(' ');
    expect(messages).toContain('cannot invoke');
    expect(messages).toContain('Attempt costs');
    expect(messages).toContain('probability');
    expect(messages).toContain('missing variable');
    expect(messages).toContain('keys');
  });
  it('inherits methods and keys while preserving per-copy state and reference warnings', () => {
    const story = locksFixture(),
      base = story.entities.find((e) => e.id === 'dagger');
    story.entities.push({ ...copy(base), id: 'variant', parentId: base.id, properties: [], requiredSlots: undefined, lockable: undefined, keyItems: undefined, unlockMethods: undefined });
    story.copies[0].definition = 'variant';
    expect(resolveEquipment(story, 'variant').unlockMethods[0].id).toBe('key-method');
    expect(unlockMethods(story, 'dagger-1')[0].requiresKey).toBeTrue();
    base.keyItems = [];
    expect(unlockAttemptReason(story, initialState(story), 'dagger-1', 'key-method', 'player')).toContain('matching key');
    story.copies[0].keyItems = ['apple'];
    expect(incomingReferences(story, 'apple').some((r) => r.includes('Equipment copy'))).toBeTrue();
    const method = dispelMethod();
    base.unlockMethods.push(method);
    expect(incomingReferences(story, 'magic')).toContain('Unlock methods of Handcuffs');
    expect(validateStory(story)).toEqual([]);
  });
  it('treats method order as cosmetic but requirements and outcomes as gameplay', () => {
    const story = locksFixture(),
      base = story.entities.find((e) => e.id === 'dagger');
    base.unlockMethods.push(dispelMethod());
    const before = playableFingerprint(story);
    base.unlockMethods.reverse();
    expect(playableFingerprint(story)).toBe(before);
    base.unlockMethods[0].chance = 90;
    expect(playableFingerprint(story)).not.toBe(before);
  });
  it('preserves notes, independent states and attempt history in version-4 saves', () => {
    const story = locksFixture(),
      game = attemptPlayerUnlock(story, startGame(story, 'Saved'), 'dagger-1', 'key-method');
    const document = {
      version: 4,
      articles: [
        { id: story.id, title: 'Story', text: '', folder: true, childIds: ['note'] },
        { id: 'note', title: 'Note', text: 'Keep this.', folder: false, childIds: [] },
      ],
      stories: [story],
      playthroughs: [game],
    };
    const parsed = parseDocument(copy(document)).data;
    const expected = copy(document);
    expected.stories[0].entities.find((e) => e.id === 'apple').key = true;
    upgradeEquipmentTypes(expected.stories[0]);
    expect(parsed).toEqual(expected);
    expect(parsed.playthroughs[0].transcript.at(-1).attempt.succeeded).toBeTrue();
    const old = locksFixture();
    for (const e of old.entities) {
      delete e.lockable;
      delete e.unlockMethods;
      delete e.keyItems;
    }
    for (const c of old.copies) delete c.locked;
    const oldGame = startGame(old, 'Old');
    expect(parseDocument({ version: 4, articles: [], stories: [old], playthroughs: [oldGame] }).data.playthroughs[0]).toEqual(oldGame);
  });
});
