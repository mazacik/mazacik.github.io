import { always, copy } from '../models/story.model';
import { applyEffect, changePlayerEquipment, check, choose, initialState, startGame } from './story-engine';
import { parseDocument } from '../services/story-document';
import { inventoryFixture } from './story-inventory-fixture';
import { inventoryIssues, quantity } from './story-inventory';
import { hasFlag } from './story-flags';
import { incomingReferences, validateStory } from './story-validation';

describe('Stacked Items alongside equipment copies', () => {
  it('records equipment actions in saved history without moving the dialogue or consuming choices', () => {
    const story = inventoryFixture(),
      original = startGame(story, 'Playthrough');
    const equipped = changePlayerEquipment(story, original, 'dagger-1', true);
    const unequipped = changePlayerEquipment(story, equipped, 'dagger-1', false);
    expect(original.transcript.length).toBe(1);
    expect(unequipped.transcript.map((entry) => entry.kind)).toEqual([undefined, 'equipmentAction', 'equipmentAction']);
    expect(unequipped.transcript.slice(1).map((entry) => entry.parts[0].text)).toEqual(['Equipped Dagger 1.', 'Unequipped Dagger 1.']);
    expect(unequipped.passage).toBe(original.passage);
    expect(unequipped.state.chosen).toEqual([]);
    const choice = story.scenes[0].passages[0].choices[0];
    const ended = choose(story, unequipped, choice.id);
    expect(ended.transcript[0].choice).toBe(choice.label);
    expect(ended.transcript.slice(1).every((entry) => !entry.choice)).toBeTrue();
    const loaded = parseDocument({ version: 4, articles: [], stories: [story], playthroughs: [ended] });
    expect(loaded.data.playthroughs[0].transcript).toEqual(ended.transcript);
    expect(() => changePlayerEquipment(story, equipped, 'dagger-4', true)).toThrow();
    expect(equipped.transcript.length).toBe(2);
  });
  it('transfers Item quantities independently and rejects equipment quantity actions', () => {
    const s = inventoryFixture(),
      state = initialState(s);
    applyEffect(s, state, { kind: 'transferQuantity', target: 'apple', from: 'player', actor: 'npc', value: 2 });
    expect(quantity(state, 'player', 'apple')).toBe(3);
    expect(quantity(state, 'npc', 'apple')).toBe(2);
    expect(check({ ...always(), kind: 'quantity', target: 'apple', actor: 'player', op: 'gte', value: 3 }, state, s)).toBeTrue();
    for (const target of ['dagger', 'dagger-1', 'player']) expect(() => applyEffect(s, state, { kind: 'giveQuantity', target, actor: 'player', value: 1 })).toThrow();
    expect(state.copyStates['dagger-1'].owner).toBe('player');
  });
  it('rejects negative, fractional, exhausted and overflowing transfers atomically', () => {
    const s = inventoryFixture(),
      state = initialState(s);
    for (const value of [-1, 0, 0.5, 6, Infinity]) {
      const before = copy(state);
      expect(() => applyEffect(s, state, { kind: 'transferQuantity', target: 'apple', from: 'player', actor: 'npc', value })).toThrow();
      expect(state).toEqual(before);
    }
    state.quantities['npc'] = { apple: Number.MAX_SAFE_INTEGER };
    const before = copy(state);
    expect(() => applyEffect(s, state, { kind: 'transferQuantity', target: 'apple', from: 'player', actor: 'npc', value: 1 })).toThrow();
    expect(state).toEqual(before);
    applyEffect(s, state, { kind: 'transferQuantity', target: 'apple', from: 'player', actor: 'player', value: 2 });
    expect(state).toEqual(before);
  });
  it('keeps Item variables fixed and owned grants until the final unit is lost', () => {
    const s = inventoryFixture(),
      apple = s.entities.find((e) => e.id === 'apple');
    apple.properties = [{ id: 'fresh', name: 'Fresh', type: 'boolean', initial: true, known: true }];
    apple.flagGrants = [{ flag: 'armed', when: 'owned' }];
    for (const c of s.copies) c.owner = '';
    const state = initialState(s);
    expect(() => applyEffect(s, state, { kind: 'set', target: 'fresh', actor: '', value: false })).toThrow();
    applyEffect(s, state, { kind: 'removeQuantity', target: 'apple', actor: 'player', value: 4 });
    expect(hasFlag(s, state, 'player', 'armed')).toBeTrue();
    applyEffect(s, state, { kind: 'removeQuantity', target: 'apple', actor: 'player', value: 1 });
    expect(hasFlag(s, state, 'player', 'armed')).toBeFalse();
  });
  it('validates Item inventory and retains references for deletion warnings', () => {
    const s = inventoryFixture();
    expect(validateStory(s)).toEqual([]);
    expect(incomingReferences(s, 'apple').join(' ')).toContain('Starting inventory');
    s.entities[0].inventory[0].quantity = 0;
    expect(inventoryIssues(s).length).toBeGreaterThan(0);
    s.entities[0].inventory[0].target = 'dagger';
    expect(inventoryIssues(s).some((i) => i.message.includes('Equipment'))).toBeTrue();
  });
});
