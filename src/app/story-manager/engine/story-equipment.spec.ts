import { always, copy, Entity, resolveEquipment, variableKey } from '../models/story.model';
import { applyEffect, check, choose, initialState, readVariable, startGame } from './story-engine';
import { inventoryRows, inventoryIssues } from './story-inventory';
import { inventoryFixture } from './story-inventory-fixture';
import { hasFlag } from './story-flags';
import { validateStory, incomingReferences } from './story-validation';
import { parseDocument } from '../services/story-document';
import { playableFingerprint } from './story-order';

describe('Equipment definitions and individual copies', () => {
  const effect = (kind: 'equip' | 'unequip', target = 'dagger-1', actor = 'player') => ({ kind, target, actor, value: '' });
  it('keeps three swords independent while equipping and transferring one', () => {
    const s = inventoryFixture(),
      state = initialState(s),
      key = variableKey('copy', 'dagger-1', 'durability');
    applyEffect(s, state, { kind: 'add', target: key, actor: '', value: -20 });
    applyEffect(s, state, effect('equip'));
    expect(inventoryRows(s, state, 'player', true).map((e) => e.id)).toEqual(['dagger-1']);
    expect(inventoryRows(s, state, 'player').filter((e) => e.kind === 'equipment').length).toBe(2);
    applyEffect(s, state, { kind: 'transferEquipment', target: 'dagger-1', from: 'player', actor: 'npc', value: '' });
    expect(state.equipment['player']).toEqual({});
    expect(state.copyStates['dagger-1']).toEqual({ owner: 'npc', values: { durability: 80 } });
    expect(state.copyStates['dagger-2'].values['durability']).toBe(100);
    expect(state.copyStates['dagger-3'].values['durability']).toBe(100);
    expect(s.copies[0].values).toEqual({});
  });
  it('resolves multiple inheritance levels, resets overrides and suppresses grants', () => {
    const s = inventoryFixture(),
      base = s.entities.find((e) => e.id === 'dagger');
    base.properties.push({ id: 'damage', name: 'Damage', type: 'number', initial: 5, known: true });
    const sharp: Entity = { ...copy(base), id: 'sharp', parentId: base.id, name: 'Sharp sword', requiredSlots: undefined, properties: [], propertyOverrides: { damage: 10 }, flagGrants: [] };
    const enchanted: Entity = { ...copy(sharp), id: 'enchanted', parentId: sharp.id, propertyOverrides: { durability: 30 }, flagGrants: [{ flag: 'armed', when: 'owned', suppressed: true }] };
    s.entities.push(sharp, enchanted);
    expect(resolveEquipment(s, enchanted.id).properties.map((p) => p.initial)).toEqual([30, 10]);
    expect(resolveEquipment(s, sharp.id).flagGrants.some((g) => g.flag === 'armed')).toBeTrue();
    expect(resolveEquipment(s, enchanted.id).flagGrants.some((g) => g.flag === 'armed')).toBeFalse();
    base.properties[1].initial = 7;
    expect(resolveEquipment(s, enchanted.id).properties[1].initial).toBe(10);
    delete sharp.propertyOverrides['damage'];
    expect(resolveEquipment(s, enchanted.id).properties[1].initial).toBe(7);
    s.copies.push({ id: 'sharp-copy', definition: sharp.id, name: 'Worn sharp sword', owner: 'player', equipped: false, values: { durability: 20 } });
    const state = initialState(s);
    expect(state.copyStates['sharp-copy'].values).toEqual({ durability: 20, damage: 7 });
    base.properties[0].initial = 90;
    expect(state.copyStates['dagger-1'].values['durability']).toBe(100);
    expect(initialState(s).copyStates['dagger-1'].values['durability']).toBe(90);
  });
  it('rejects cycles, missing parents, invalid copy overrides and shared copy IDs', () => {
    const s = inventoryFixture(),
      base = s.entities.find((e) => e.id === 'dagger');
    base.parentId = base.id;
    expect(() => resolveEquipment(s, base.id)).toThrowError(/Circular/);
    expect(validateStory(s).some((i) => i.message.includes('Circular'))).toBeTrue();
    base.parentId = 'missing';
    expect(validateStory(s).some((i) => i.message.includes('Missing equipment'))).toBeTrue();
    delete base.parentId;
    s.copies[0].values['durability'] = 'bad';
    s.copies[1].id = s.copies[0].id;
    expect(inventoryIssues(s).some((i) => i.message.includes('override'))).toBeTrue();
    expect(inventoryIssues(s).some((i) => i.message.includes('unique'))).toBeTrue();
  });
  it('replaces whole multiple-slot copies without touching another character', () => {
    const s = inventoryFixture(),
      base = s.entities.find((e) => e.id === 'dagger');
    s.slots = ['Left', 'Right', 'Body'];
    base.requiredSlots = ['Left', 'Right'];
    s.entities.push({ ...copy(base), id: 'shield', requiredSlots: ['Left', 'Body'], properties: [], flagGrants: [] });
    s.copies.push({ id: 'shield-copy', definition: 'shield', name: 'Shield', owner: 'player', equipped: false, values: {} });
    const state = initialState(s);
    applyEffect(s, state, effect('equip'));
    applyEffect(s, state, effect('equip', 'dagger-4', 'npc'));
    applyEffect(s, state, effect('equip', 'shield-copy'));
    expect(state.equipment['player']).toEqual({ Left: 'shield-copy', Body: 'shield-copy' });
    expect(state.equipment['npc']).toEqual({ Left: 'dagger-4', Right: 'dagger-4' });
    expect(state.copyStates['dagger-1'].owner).toBe('player');
    applyEffect(s, state, effect('unequip', 'shield-copy'));
    const before = copy(state);
    applyEffect(s, state, effect('unequip', 'shield-copy'));
    expect(state).toEqual(before);
  });
  it('keeps failed copy actions atomic and only gives unassigned copies', () => {
    const s = inventoryFixture(),
      state = initialState(s),
      before = copy(state);
    for (const e of [
      effect('equip', 'dagger-4'),
      { kind: 'giveEquipment' as const, target: 'dagger-1', actor: 'npc', value: '' },
      { kind: 'transferEquipment' as const, target: 'dagger-1', from: 'npc', actor: 'player', value: '' },
    ]) {
      expect(() => applyEffect(s, state, e)).toThrow();
      expect(state).toEqual(before);
    }
    applyEffect(s, state, { kind: 'removeEquipment', target: 'dagger-1', actor: 'player', value: '' });
    applyEffect(s, state, { kind: 'giveEquipment', target: 'dagger-1', actor: 'npc', value: '' });
    expect(state.copyStates['dagger-1'].owner).toBe('npc');
  });
  it('validates all occupied starting slots and grants only from fully equipped copies', () => {
    const s = inventoryFixture(),
      base = s.entities.find((e) => e.id === 'dagger');
    s.slots = ['Left', 'Right'];
    base.requiredSlots = ['Left', 'Right'];
    s.copies[0].equipped = true;
    s.copies[1].equipped = true;
    expect(inventoryIssues(s).some((i) => i.message.includes('overlaps'))).toBeTrue();
    s.copies[1].equipped = false;
    const state = initialState(s);
    expect(hasFlag(s, state, 'player', 'ready')).toBeTrue();
    delete state.equipment['player']['Right'];
    expect(hasFlag(s, state, 'player', 'ready')).toBeFalse();
    expect(check({ ...always(), kind: 'wears', target: 'dagger-1', actor: 'player' }, state, s)).toBeFalse();
  });
  it('round-trips copy values and owners and resumes without resetting durability', () => {
    const s = inventoryFixture(),
      state = initialState(s),
      key = variableKey('copy', 'dagger-1', 'durability');
    applyEffect(s, state, { kind: 'set', target: key, actor: '', value: 42 });
    const game = startGame(s, 'Saved', s.start, state);
    const parsed = parseDocument(copy({ version: 4, articles: [], stories: [s], playthroughs: [game] })).data;
    const next = choose(parsed.stories[0], parsed.playthroughs[0], s.scenes[0].passages[0].choices[0].id);
    expect(next.status).toBe('ended');
    expect(readVariable(s, next.state, key)).toBe(42);
    expect(parsed.playthroughs[0]).toEqual(game);
  });
  it('tracks inherited and copy references while copy ordering stays cosmetic', () => {
    const s = inventoryFixture(),
      before = playableFingerprint(s);
    s.copies.reverse();
    expect(playableFingerprint(s)).toBe(before);
    s.copies[0].values['durability'] = 20;
    expect(playableFingerprint(s)).not.toBe(before);
    const c = s.scenes[0].passages[0].choices[0];
    c.steps.unshift({ id: 'damage', kind: 'effect', effect: { kind: 'add', target: variableKey('copy', 'dagger-1', 'durability'), actor: '', value: -1 } });
    expect(incomingReferences(s, 'dagger-1').length).toBeGreaterThan(0);
    expect(incomingReferences(s, 'durability').length).toBeGreaterThan(0);
    expect(incomingReferences(s, 'dagger').some((r) => r.includes('copy'))).toBeTrue();
  });
});
