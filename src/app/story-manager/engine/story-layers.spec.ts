import { upgradeEquipmentTypes } from '../services/equipment-types';
import { applyEffect, changePlayerEquipment, choose, initialState, startGame, check } from './story-engine';
import { coveredLayers, layerErrors } from './story-layers';
import { layersFixture } from './story-layers-fixture';
import { always, copy, Effect } from '../models/story.model';
import { playableFingerprint } from './story-order';
import { hasFlag } from './story-flags';
import { parseDocument } from '../services/story-document';

describe('Explicit equipment layer coverage', () => {
  const effect = (kind: Effect['kind'], target: string, ignoreLayering = false): Effect => ({ kind, target, actor: 'player', value: '', ignoreLayering });
  it('blocks removal through coverage chains without blocking unrelated helmets', () => {
    const story = layersFixture(),
      state = initialState(story),
      before = copy(state);
    expect(() => applyEffect(story, state, effect('unequip', 'dagger-1'))).toThrowError(/Armour/);
    expect(() => applyEffect(story, state, effect('unequip', 'Underwear-copy'))).toThrowError(/Linen shirt.*Armour/);
    expect(state).toEqual(before);
    applyEffect(story, state, effect('unequip', 'Helmet-copy'));
    expect(state.equipment['player']['Helmet']).toBeUndefined();
    applyEffect(story, state, effect('unequip', 'Armour-copy'));
    applyEffect(story, state, effect('unequip', 'dagger-1'));
    expect(hasFlag(story, state, 'player', 'ready')).toBeFalse();
    applyEffect(story, state, effect('unequip', 'Underwear-copy'));
    expect(state.equipment['player']).toEqual({});
  });
  it('follows absent intermediate layers and ignores layer display order', () => {
    const story = layersFixture();
    story.copies[0].equipped = false;
    story.slots.reverse();
    const state = initialState(story);
    expect(coveredLayers(story, 'Armour')).toEqual(new Set(['Shirt', 'Underwear']));
    expect(() => applyEffect(story, state, effect('unequip', 'Underwear-copy'))).toThrowError(/Armour/);
    expect(() => applyEffect(story, state, effect('equip', 'dagger-1'))).toThrowError(/Armour/);
  });
  it('initializes starting loadouts independently of copy ordering and retains exclusive layers', () => {
    const story = layersFixture(),
      state = initialState(story);
    story.copies.reverse();
    const reordered = initialState(story);
    expect(reordered.equipment).toEqual(state.equipment);
    expect(reordered.copyStates).toEqual(state.copyStates);
    expect(new Set(reordered.known)).toEqual(new Set(state.known));
    story.copies.find((c) => c.id === 'dagger-2').equipped = true;
    expect(() => initialState(story)).toThrowError(/overlaps/);
  });
  it('checks all layers of displaced equipment before replacement', () => {
    const story = layersFixture();
    story.slots.push('Belt');
    story.entities.find((e) => e.id === 'dagger').requiredSlots.push('Belt');
    story.entities.push({ ...copy(story.entities.find((e) => e.id === 'dagger')), id: 'belt', requiredSlots: ['Belt'] });
    story.copies.push({ id: 'belt-copy', definition: 'belt', name: 'Belt', owner: 'player', equipped: false, values: {} });
    const state = initialState(story),
      before = copy(state);
    expect(() => applyEffect(story, state, effect('equip', 'belt-copy'))).toThrowError(/Armour/);
    expect(state).toEqual(before);
    applyEffect(story, state, effect('unequip', 'Armour-copy'));
    applyEffect(story, state, effect('equip', 'belt-copy'));
    expect(state.equipment['player']['Belt']).toBe('belt-copy');
    expect(state.equipment['player']['Shirt']).toBeUndefined();
  });
  it('inherits layer assignments and checks any occupied layer of a covering copy', () => {
    const story = layersFixture();
    story.entities.push({ ...copy(story.entities.find((e) => e.id === 'dagger')), id: 'variant', parentId: 'dagger', requiredSlots: undefined, properties: [], flagGrants: [] });
    story.copies[0].definition = 'variant';
    story.entities.find((e) => e.id === 'Armour').requiredSlots.push('Helmet');
    story.copies.find((c) => c.id === 'Helmet-copy').equipped = false;
    const state = initialState(story);
    expect(check({ ...always(), kind: 'wears', actor: 'player', target: 'dagger-1' }, state, story)).toBeTrue();
    expect(() => applyEffect(story, state, effect('unequip', 'dagger-1'))).toThrowError(/Armour/);
  });
  it('confiscates and transfers only accessible copies, preserving their values', () => {
    for (const kind of ['removeEquipment', 'transferEquipment'] as const) {
      const story = layersFixture(),
        state = initialState(story),
        before = copy(state);
      const action = { ...effect(kind, 'dagger-1'), actor: kind === 'transferEquipment' ? 'npc' : 'player', from: 'player' };
      expect(() => applyEffect(story, state, action)).toThrowError(/Armour/);
      expect(state).toEqual(before);
      applyEffect(story, state, { ...action, ignoreLayering: true });
      expect(state.equipment['player']['Armour']).toBe('Armour-copy');
      expect(state.equipment['player']['Shirt']).toBeUndefined();
      expect(state.copyStates['dagger-1']).toEqual({ owner: kind === 'transferEquipment' ? 'npc' : '', values: { durability: 100 } });
    }
  });
  it('allows explicit equip/unequip overrides without bypassing ownership or occupancy', () => {
    const story = layersFixture(),
      state = initialState(story);
    applyEffect(story, state, effect('unequip', 'dagger-1', true));
    applyEffect(story, state, effect('equip', 'dagger-2', true));
    expect(state.equipment['player']['Armour']).toBe('Armour-copy');
    expect(state.equipment['player']['Shirt']).toBe('dagger-2');
    expect(() => applyEffect(story, state, effect('equip', 'dagger-4', true))).toThrowError(/does not own/);
    applyEffect(story, state, effect('equip', 'dagger-1', true));
    expect(Object.values(state.equipment['player'])).not.toContain('dagger-2');
  });
  it('rolls back earlier dialogue effects when a covered removal fails', () => {
    const story = layersFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    choice.available = always();
    choice.steps = [
      { id: 'give', kind: 'effect', effect: { kind: 'giveQuantity', actor: 'player', target: 'apple', value: 3 } },
      { id: 'remove', kind: 'effect', effect: effect('removeEquipment', 'dagger-1') },
      { id: 'end', kind: 'end' },
    ];
    const game = startGame(story, 'Test'),
      before = copy(game);
    expect(() => choose(story, game, choice.id)).toThrowError(/Armour/);
    expect(game).toEqual(before);
  });
  it('rejects invalid coverage even with dialogue overrides', () => {
    for (const coverage of [{ Armour: ['Armour'] }, { Armour: ['Shirt'], Shirt: ['Armour'] }, { Armour: ['Missing'] }, { Missing: ['Shirt'] }]) {
      const story = layersFixture(),
        state = initialState(story);
      story.layerCoverage = coverage;
      expect(layerErrors(story).length).toBeGreaterThan(0);
      expect(() => initialState(story)).toThrow();
      expect(() => applyEffect(story, state, effect('unequip', 'Armour-copy', true))).toThrow();
    }
  });
  it('treats display ordering as cosmetic and coverage as gameplay', () => {
    const story = layersFixture(),
      fingerprint = playableFingerprint(story);
    story.slots.reverse();
    expect(playableFingerprint(story)).toBe(fingerprint);
    story.layerCoverage['Armour'] = ['Helmet'];
    expect(playableFingerprint(story)).not.toBe(fingerprint);
  });
  it('preserves version-4 saves, notes and equipment when coverage is missing or configured', () => {
    for (const configured of [false, true]) {
      const story = layersFixture();
      if (!configured) delete story.layerCoverage;
      const game = changePlayerEquipment(story, startGame(story, 'Saved'), 'Helmet-copy', false);
      const source = {
        version: 4,
        articles: [
          { id: story.id, title: 'Story', text: '', folder: true, childIds: ['note'] },
          { id: 'note', title: 'Note', text: 'Keep\nthis text.', folder: false, childIds: [] },
        ],
        stories: [story],
        playthroughs: [game],
      };
      const before = copy(source),
        parsed = parseDocument(source).data;
      const expected = copy(before);
      upgradeEquipmentTypes(expected.stories[0]);
      expect(parsed).toEqual(expected);
      expect(source).toEqual(before);
      expect(changePlayerEquipment(parsed.stories[0], parsed.playthroughs[0], 'Helmet-copy', true).state.equipment['player']['Helmet']).toBe('Helmet-copy');
    }
  });
  it('player actions preserve dialogue, update grants, and reject stale/ended games', () => {
    const story = layersFixture(),
      game = startGame(story, 'Play');
    const next = changePlayerEquipment(story, changePlayerEquipment(story, game, 'Armour-copy', false), 'dagger-1', false);
    expect(next.transcript.slice(0, game.transcript.length)).toEqual(game.transcript);
    expect(next.transcript.slice(-2).map((entry) => entry.parts[0].text)).toEqual(['Unequipped Armour.', 'Unequipped Linen shirt.']);
    expect(next.state.chosen).toEqual(game.state.chosen);
    expect(next.scene).toBe(game.scene);
    expect(next.trace.at(-1)).toBe('Unequip: Linen shirt');
    expect(hasFlag(story, next.state, 'player', 'ready')).toBeFalse();
    expect(game.state.equipment['player']['Shirt']).toBe('dagger-1');
    expect(() => changePlayerEquipment(story, { ...game, revision: game.revision + 1 }, 'Helmet-copy', false)).toThrowError(/no longer active/);
    expect(() => changePlayerEquipment(story, { ...game, status: 'ended' }, 'Helmet-copy', false)).toThrowError(/no longer active/);
  });
});
