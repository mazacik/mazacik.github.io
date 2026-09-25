import { always, copy, newFlag, variableKey } from '../models/story.model';
import { applyEffect, check, choose, initialState, readVariable, renderText, startGame, writeVariable } from './story-engine';
import { inventoryFixture } from './story-inventory-fixture';
import { validateStory } from './story-validation';
import { hasFlag } from './story-flags';
import { parseDocument } from '../services/story-document';

describe('Shared typed Story and Character variables', () => {
  function fixture() {
    const s = inventoryFixture();
    s.flags.push(
      { ...newFlag(), id: 'weather', name: 'Weather', type: 'text', initial: 'Sunny', visible: true },
      { ...newFlag(), id: 'mood', name: 'Mood', scope: 'character', type: 'text', initial: 'Calm', visible: true },
      { ...newFlag(), id: 'age', name: 'Age', scope: 'character', type: 'number', initial: 18 },
      { ...newFlag(), id: 'rainy', name: 'Rainy' },
      { ...newFlag(), id: 'dry', name: 'Dry', initial: true },
    );
    return s;
  }
  it('defines each variable once but initializes independent values and character overrides', () => {
    const s = fixture();
    s.entities[0].variableValues = { mood: 'Happy', age: 30 };
    const state = initialState(s);
    expect(state.characterValues['player']['mood']).toBe('Happy');
    expect(state.characterValues['npc']['mood']).toBe('Calm');
    writeVariable(s, state, variableKey('character', 'player', 'age'), 31);
    expect(state.characterValues['npc']['age']).toBe(18);
    expect(s.entities[0].variableValues['age']).toBe(30);
    expect(validateStory(s)).toEqual([]);
  });
  it('handles Story variables without actors and keeps scopes separate', () => {
    const s = fixture(),
      state = initialState(s);
    expect(hasFlag(s, state, '', 'dry')).toBeTrue();
    applyEffect(s, state, { kind: 'addFlag', target: 'rainy', actor: '', value: '' });
    expect(hasFlag(s, state, '', 'dry')).toBeTrue();
    expect(hasFlag(s, state, '', 'rainy')).toBeTrue();
    expect(() => hasFlag(s, state, 'player', 'rainy')).toThrow();
  });
  it('supports typed comparisons and nested dialogue actions visible immediately', () => {
    const s = fixture(),
      choice = s.scenes[0].passages[0].choices[0],
      weather = variableKey('story', '', 'weather'),
      age = variableKey('character', 'npc', 'age');
    choice.steps = [
      { id: 'weather', kind: 'effect', effect: { kind: 'set', target: weather, actor: '', value: 'Rain' } },
      { id: 'birthday', kind: 'effect', effect: { kind: 'add', target: age, actor: '', value: 1 } },
      { id: 'check', kind: 'condition', condition: { ...always(), kind: 'property', target: weather, value: 'Rain' }, yes: [{ id: 'end', kind: 'end' }], no: [] },
    ];
    const original = startGame(s, 'Variables'),
      next = choose(s, original, choice.id);
    expect(next.status).toBe('ended');
    expect(readVariable(s, next.state, age)).toBe(19);
    expect(readVariable(s, original.state, weather)).toBe('Sunny');
    expect(renderText('[[property:' + weather + ']]', s, next.state)[0].text).toBe('Rain');
    expect(check({ ...always(), kind: 'property', target: age, op: 'gte', value: 19 }, next.state, s)).toBeTrue();
  });
  it('rejects invalid value types and missing character references', () => {
    const s = fixture(),
      state = initialState(s),
      before = copy(state);
    for (const [key, value] of [
      [variableKey('story', '', 'weather'), 4],
      [variableKey('story', '', 'dry'), 'true'],
      [variableKey('character', 'missing', 'age'), 1],
      [variableKey('character', 'npc', 'age'), Infinity],
    ] as const)
      expect(() => writeVariable(s, state, key, value)).toThrow();
    expect(state).toEqual(before);
  });
  it('preserves independent scoped values when saved and resumed', () => {
    const s = fixture(),
      game = startGame(s, 'Saved');
    writeVariable(s, game.state, variableKey('character', 'npc', 'mood'), 'Angry');
    const parsed = parseDocument(copy({ version: 4, articles: [], stories: [s], playthroughs: [game] })).data;
    expect(parsed.playthroughs[0]).toEqual(game);
    expect(choose(parsed.stories[0], parsed.playthroughs[0], s.scenes[0].passages[0].choices[0].id).state.characterValues['npc']['mood']).toBe('Angry');
  });
});
