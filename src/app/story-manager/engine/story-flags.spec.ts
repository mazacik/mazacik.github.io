import { always, copy, uid } from '../models/story.model';
import { applyEffect, check, choose, initialState, startGame } from './story-engine';
import { flagStatuses, hasFlag, validateFlags } from './story-flags';
import { flagsFixture } from './story-flags-fixture';
import { incomingReferences, validateStory } from './story-validation';

describe('Reusable character flags', () => {
  it('evaluates the same rules independently for every character', () => {
    const story = flagsFixture(),
      state = initialState(story);
    expect(hasFlag(story, state, 'player', 'top')).toBeTrue();
    expect(hasFlag(story, state, 'Mira', 'top')).toBeFalse();
    expect(hasFlag(story, state, 'Mira', 'cursed')).toBeTrue();
    expect(hasFlag(story, state, 'player', 'cursed')).toBeFalse();
    applyEffect(story, state, { kind: 'unequip', target: 'coat-copy', actor: 'player', value: '' });
    applyEffect(story, state, { kind: 'transferEquipment', target: 'coat-copy', from: 'player', actor: 'Mira', value: 1 });
    expect(hasFlag(story, state, 'Mira', 'top')).toBeFalse();
    applyEffect(story, state, { kind: 'equip', target: 'coat-copy', actor: 'Mira', value: '' });
    expect(hasFlag(story, state, 'Mira', 'top')).toBeTrue();
    expect(hasFlag(story, state, 'player', 'top')).toBeFalse();
  });
  it('requires equipment to be equipped even for legacy owned effects', () => {
    const story = flagsFixture(),
      state = initialState(story);
    applyEffect(story, state, { kind: 'unequip', target: 'key-copy', actor: 'player', value: '' });
    const sword = story.entities.find((e) => e.id === 'key');
    sword.flagGrants.push({ flag: 'cursed', when: 'equipped' });
    expect(hasFlag(story, state, 'player', 'armed')).toBeFalse();
    expect(hasFlag(story, state, 'player', 'cursed')).toBeFalse();
    applyEffect(story, state, { kind: 'equip', target: 'key-copy', actor: 'player', value: '' });
    expect(hasFlag(story, state, 'player', 'cursed')).toBeTrue();
    expect(hasFlag(story, state, 'player', 'armed')).toBeTrue();
    applyEffect(story, state, { kind: 'unequip', target: 'key-copy', actor: 'player', value: '' });
    expect(hasFlag(story, state, 'player', 'armed')).toBeFalse();
    expect(hasFlag(story, state, 'player', 'cursed')).toBeFalse();
  });
  it('retains a flag until the last of two object sources is removed', () => {
    const story = flagsFixture();
    story.entities.push({ ...copy(story.entities.find((e) => e.id === 'key')), id: 'dagger', name: 'Dagger', requiredSlots: ['Feet'] });
    story.copies.push({ id: 'dagger-copy', definition: 'dagger', name: 'Dagger', owner: 'player', equipped: true, values: {} });
    const state = initialState(story);
    expect(flagStatuses(story, state, 'player').find((s) => s.flag.id === 'armed').sources.length).toBe(2);
    applyEffect(story, state, { kind: 'removeEquipment', target: 'key-copy', actor: 'player', value: 1 });
    expect(hasFlag(story, state, 'player', 'armed')).toBeTrue();
    applyEffect(story, state, { kind: 'removeEquipment', target: 'dagger-copy', actor: 'player', value: 1 });
    expect(hasFlag(story, state, 'player', 'armed')).toBeFalse();
  });
  it('replaces equipped sources without changing owned sources', () => {
    const story = flagsFixture();
    story.entities.push({ ...copy(story.entities.find((e) => e.id === 'coat')), id: 'replacement', flagGrants: [] });
    story.copies.push({ id: 'replacement-copy', definition: 'replacement', name: 'Replacement', owner: 'player', equipped: false, values: {} });
    const state = initialState(story);
    applyEffect(story, state, { kind: 'equip', target: 'replacement-copy', actor: 'player', value: '' });
    expect(hasFlag(story, state, 'player', 'top')).toBeFalse();
    expect(state.copyStates['coat-copy'].owner).toBe('player');
  });
  it('combines direct flags with grants and removes only the direct assignment', () => {
    const story = flagsFixture(),
      state = initialState(story);
    const effect = { target: 'armed', actor: 'player', value: '' };
    applyEffect(story, state, { ...effect, kind: 'addFlag' });
    applyEffect(story, state, { ...effect, kind: 'addFlag' });
    expect(state.characterValues['player']['armed']).toBeTrue();
    applyEffect(story, state, { ...effect, kind: 'removeFlag' });
    expect(hasFlag(story, state, 'player', 'armed')).toBeTrue();
    applyEffect(story, state, { ...effect, kind: 'addFlag' });
    applyEffect(story, state, { kind: 'removeEquipment', target: 'key-copy', actor: 'player', value: 1 });
    expect(hasFlag(story, state, 'player', 'armed')).toBeTrue();
    applyEffect(story, state, { ...effect, kind: 'removeFlag' });
    expect(hasFlag(story, state, 'player', 'armed')).toBeFalse();
  });
  it('makes effects visible to subsequent checks inside random/conditional branches', () => {
    const story = flagsFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    choice.available = { ...always(), kind: 'not', children: [{ ...always(), kind: 'flag', target: 'cursed', actor: 'player' }] };
    choice.steps = [
      { id: uid(), kind: 'effect', effect: { kind: 'addFlag', target: 'cursed', actor: 'player', value: '' } },
      {
        id: uid(),
        kind: 'random',
        branches: [
          {
            id: uid(),
            percent: 100,
            steps: [
              {
                id: uid(),
                kind: 'condition',
                condition: { ...always(), kind: 'flag', target: 'cursed', actor: 'player' },
                yes: [{ id: uid(), kind: 'end' }],
                no: [{ id: uid(), kind: 'go', scene: story.scenes[1].id, passage: '' }],
              },
            ],
          },
        ],
      },
    ];
    expect(validateStory(story)).toEqual([]);
    const original = startGame(story, 'Flags test');
    expect(check(choice.available, original.state, story)).toBeTrue();
    const next = choose(story, original, choice.id, () => 0.6);
    expect(next.status).toBe('ended');
    expect(next.state.characterValues['player']['cursed']).toBeTrue();
    expect(original.state.characterValues['player']['cursed']).toBeFalse();
  });
  it('persists stored values and equipment sources after resume', () => {
    const story = flagsFixture(),
      game = startGame(story, 'Saved');
    applyEffect(story, game.state, { kind: 'addFlag', target: 'bottom', actor: 'player', value: '' });
    const resumed = copy(game);
    expect(hasFlag(story, resumed.state, 'player', 'top')).toBeTrue();
    expect(resumed.state.characterValues['player']['bottom']).toBeTrue();
  });
  it('rejects missing targets and invalid character assignments', () => {
    const story = flagsFixture(),
      state = initialState(story);
    expect(() => applyEffect(story, state, { kind: 'addFlag', target: 'missing', actor: 'player', value: '' })).toThrow();
    expect(() => applyEffect(story, state, { kind: 'addFlag', target: 'armed', actor: 'key', value: '' })).toThrow();
    expect(() => hasFlag(story, state, 'missing-character', 'armed')).toThrow();
    story.entities.find((e) => e.id === 'player').initialFlags = ['missing'];
    story.entities.find((e) => e.id === 'key').flagGrants = [{ flag: 'missing', when: 'owned' }];
    expect(validateFlags(story).filter((i) => i.message.includes('stored Character Boolean variables')).length).toBe(2);
  });
  it('rejects invalid equipped grants', () => {
    const story = flagsFixture();
    const sword = story.entities.find((e) => e.id === 'key');
    sword.requiredSlots = [];
    sword.flagGrants = [{ flag: 'armed', when: 'equipped' }];
    expect(validateFlags(story).some((i) => i.message.includes('equipment slot'))).toBeTrue();
  });
  it('reports every kind of flag reference and preserves behavior after renaming', () => {
    const story = flagsFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    story.entities.find((e) => e.id === 'player').initialFlags = ['top'];
    choice.available = { ...always(), kind: 'flag', actor: 'player', target: 'top' };
    choice.steps = [
      { id: uid(), kind: 'effect', effect: { kind: 'removeFlag', actor: 'player', target: 'top', value: '' } },
      { id: uid(), kind: 'end' },
    ];
    const references = incomingReferences(story, 'top').join(' ');
    expect(references).toContain('Starting Boolean values of player');
    expect(references).toContain('Variable grants from Shirt');
    expect(references).toContain('Convince the guard');
    story.flags.find((f) => f.id === 'top').name = 'Covered torso';
    expect(check(choice.available, initialState(story), story)).toBeTrue();
    story.flags = story.flags.filter((f) => f.id !== 'top');
    expect(validateStory(story).some((i) => i.message.includes('Boolean check'))).toBeTrue();
    expect(validateStory(story).some((i) => i.message.includes('Direct flag effects'))).toBeTrue();
  });
});
