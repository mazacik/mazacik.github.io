import { applyEffect, check, choose, initialState, renderText, startGame, readVariable, writeVariable } from './story-engine';
import { sceneEdges, validateStory } from './story-validation';
import { storyFixture } from './story-fixture';
import { always, copy, newChoice, uid, variableKey } from '../models/story.model';

describe('Interactive story engine', () => {
  it('consumes choices once per playthrough, including after resuming, and resets on a new game', () => {
    const story = storyFixture();
    const scene = story.scenes[0],
      passage = scene.passages[0],
      choice = newChoice();
    expect(choice.repeatable).toBeFalse();
    choice.steps = [{ id: uid(), kind: 'go', scene: scene.id, passage: passage.id }];
    passage.choices = [choice];
    // Older choices without the field use the same single-use default.
    delete choice.repeatable;
    const original = startGame(story, 'First');
    const next = choose(story, original, choice.id);
    expect(next.state.chosen).toContain(choice.id);
    expect(original.state.chosen).not.toContain(choice.id);
    expect(() => choose(story, copy(next), choice.id)).toThrowError('That choice is unavailable.');
    expect(() => choose(story, startGame(story, 'New game'), choice.id)).not.toThrow();
  });
  it('allows repeatable choices to run again while still respecting their conditions', () => {
    const story = storyFixture();
    const scene = story.scenes[0],
      passage = scene.passages[0],
      choice = newChoice();
    choice.repeatable = true;
    choice.steps = [{ id: uid(), kind: 'go', scene: scene.id, passage: passage.id }];
    passage.choices = [choice];
    const first = choose(story, startGame(story, 'Test'), choice.id);
    const second = choose(story, copy(first), choice.id);
    expect(second.transcript.length).toBe(first.transcript.length + 1);
    choice.available = { ...always(), kind: 'not', children: [always()] };
    expect(() => choose(story, second, choice.id)).toThrowError('That choice is unavailable.');
  });
  it('validates the four-scene example and creates independent starting state', () => {
    const story = storyFixture();
    expect(validateStory(story)).toEqual([]);
    const game = startGame(story, 'First');
    game.state.storyValues['trust'] = 9;
    expect(initialState(story).storyValues['trust']).toBe(0);
    expect(Object.keys(game.state).sort()).toEqual(['chosen', 'known', 'storyValues']);
  });
  it('evaluates variables before randomness and handles the 50% boundary', () => {
    const story = storyFixture(),
      game = startGame(story, 'Test');
    const choice = story.scenes[0].passages[0].choices[0];
    expect(choose(story, game, choice.id, () => 0).scene).toBe(story.scenes[2].id);
    expect(choose(story, game, choice.id, () => 0.499999).scene).toBe(story.scenes[2].id);
    expect(choose(story, game, choice.id, () => 0.5).scene).toBe(story.scenes[1].id);
    expect(choose(story, game, choice.id, () => 0.99999).scene).toBe(story.scenes[1].id);
    game.state.storyValues['trust'] = -1;
    const random = jasmine.createSpy().and.returnValue(0);
    expect(choose(story, game, choice.id, random).scene).toBe(story.scenes[1].id);
    expect(random).not.toHaveBeenCalled();
  });
  it('supports nested checks inside a random outcome and ordered effects', () => {
    const story = storyFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    choice.steps = [
      { id: uid(), kind: 'effect', effect: { kind: 'set', target: variableKey('secret'), value: true } },
      {
        id: uid(),
        kind: 'random',
        branches: [
          {
            id: uid(),
            percent: 100,
            steps: [{ id: uid(), kind: 'condition', condition: { ...always(), kind: 'property', target: variableKey('secret'), value: true }, yes: [{ id: uid(), kind: 'end' }], no: [] }],
          },
        ],
      },
      { id: uid(), kind: 'go', scene: story.scenes[1].id, passage: '' },
    ];
    expect(validateStory(story)).toEqual([]);
    expect(choose(story, startGame(story, 'Test'), choice.id, () => 0.4).status).toBe('ended');
  });
  it('records the selected choice before executing its condition', () => {
    const story = storyFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    choice.steps = [{ id: uid(), kind: 'condition', condition: { ...always(), kind: 'chosen', target: choice.id }, yes: [{ id: uid(), kind: 'end' }], no: [] }];
    expect(choose(story, startGame(story, 'Test'), choice.id).status).toBe('ended');
  });
  it('commits effects together and never mutates the source playthrough on error', () => {
    const story = storyFixture(),
      game = startGame(story, 'Test'),
      original = copy(game),
      choice = story.scenes[0].passages[0].choices[0];
    choice.steps = [
      { id: uid(), kind: 'effect', effect: { kind: 'add', target: variableKey('trust'), value: 1 } },
      { id: uid(), kind: 'go', scene: 'deleted', passage: '' },
    ];
    expect(() => choose(story, game, choice.id)).toThrow();
    expect(game).toEqual(original);
  });
  it('resumes exact passage, variables, and results after serialization', () => {
    const story = storyFixture();
    let game = choose(story, startGame(story, 'Test'), story.scenes[0].passages[0].choices[0].id, () => 0.1);
    game = choose(story, game, story.scenes[2].passages[0].choices[0].id);
    const resumed = copy(game);
    expect(resumed.passage).toBe(story.scenes[2].passages[1].id);
    expect(resumed.state.storyValues['trust']).toBe(1);
    expect(resumed.state.storyValues['secret']).toBeTrue();
    expect(resumed.trace.some((line) => line.includes('draw 0.1'))).toBeTrue();
    expect(resumed.transcript[0].parts.some((part) => part.text === '0')).toBeTrue();
    expect(game.transcript[0]).toEqual(resumed.transcript[0]);
  });
  it('supports all, any, not, numeric, Boolean, knowledge, and choice checks', () => {
    const story = storyFixture(),
      state = initialState(story);
    expect(
      check(
        {
          ...always(),
          kind: 'all',
          children: [
            { ...always(), kind: 'not', children: [{ ...always(), kind: 'flag', target: 'secret' }] },
            { ...always(), kind: 'property', target: variableKey('trust'), op: 'gte', value: 0 },
          ],
        },
        state,
        story,
      ),
    ).toBeTrue();
    expect(check({ ...always(), kind: 'not', children: [{ ...always(), kind: 'known', target: variableKey('secret') }] }, state, story)).toBeTrue();
    expect(check({ ...always(), kind: 'any', children: [{ ...always(), kind: 'chosen', target: 'missing' }, always()] }, state, story)).toBeTrue();
  });
  it('supports typed values, Boolean actions, visibility and revelation', () => {
    const story = storyFixture(),
      state = initialState(story);
    applyEffect(story, state, { kind: 'set', target: variableKey('weather'), value: 'Rain' });
    applyEffect(story, state, { kind: 'addFlag', target: 'secret', value: '' });
    expect(check({ ...always(), kind: 'flag', target: 'secret' }, state, story)).toBeTrue();
    expect(readVariable(story, state, variableKey('weather'))).toBe('Rain');
    expect(renderText('[[property:' + variableKey('secret') + ']]', story, state)).toEqual([{ text: 'Unknown' }]);
    applyEffect(story, state, { kind: 'reveal', target: variableKey('secret'), value: '' });
    expect(renderText('[[property:' + variableKey('secret') + ']]', story, state)).toEqual([{ text: 'true' }]);
    applyEffect(story, state, { kind: 'removeFlag', target: 'secret', value: '' });
    expect(check({ ...always(), kind: 'flag', target: 'secret' }, state, story)).toBeFalse();
  });
  it('rejects missing variables, wrong types, and nonfinite numbers without changing state', () => {
    const story = storyFixture(),
      state = initialState(story),
      before = copy(state);
    expect(() => writeVariable(story, state, variableKey('weather'), 4)).toThrow();
    expect(() => writeVariable(story, state, variableKey('trust'), Infinity)).toThrow();
    expect(() => writeVariable(story, state, variableKey('missing'), 1)).toThrow();
    expect(() => applyEffect(story, state, { kind: 'add', target: variableKey('weather'), value: 1 })).toThrow();
    expect(state).toEqual(before);
  });
  it('plays a story without variables or characters', () => {
    const story = storyFixture();
    story.flags = [];
    const passage = story.scenes[0].passages[0];
    passage.text = 'A beginning.';
    passage.choices = [{ ...newChoice(), steps: [{ id: uid(), kind: 'end' }] }];
    const game = startGame(story, 'Simple');
    expect(game.transcript[0].parts).toEqual([{ text: 'A beginning.' }]);
    expect(choose(story, game, passage.choices[0].id).status).toBe('ended');
  });
  it('rejects unavailable choices and stale or canceled games', () => {
    const story = storyFixture(),
      game = startGame(story, 'Test'),
      choice = story.scenes[0].passages[0].choices[0];
    choice.available = { ...always(), kind: 'known', target: variableKey('secret') };
    expect(() => choose(story, game, choice.id)).toThrowError('That choice is unavailable.');
    choice.available = always();
    story.revision++;
    expect(() => choose(story, game, choice.id)).toThrow();
    story.revision--;
    game.status = 'canceled';
    expect(() => choose(story, game, choice.id)).toThrow();
  });
  it('keeps variable IDs after renaming and renders HTML as plain text', () => {
    const story = storyFixture(),
      state = initialState(story);
    story.flags[0].name = 'Renamed';
    expect(renderText('<script>bad()</script> [[property:' + variableKey('trust') + ']]', story, state)).toEqual([{ text: '<script>bad()</script> ' }, { text: '0' }]);
  });
  it('validates missing references, destinations, percentages, and unreachable steps', () => {
    const story = storyFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    const random = choice.steps[0].kind === 'condition' ? choice.steps[0].yes[0] : null;
    if (random?.kind === 'random') random.branches[0].percent = 25;
    story.scenes[0].passages[0].text = '[[property:' + variableKey('deleted') + ']]';
    choice.steps.push({ id: uid(), kind: 'go', scene: 'deleted', passage: '' });
    const messages = validateStory(story)
      .map((i) => i.message)
      .join(' ');
    expect(messages).toContain('totaling 100');
    expect(messages).toContain('missing variable reference');
    expect(messages).toContain('missing scene');
    expect(messages).toContain('Remove steps after');
  });
  it('finds incomplete paths while allowing a shared continuation after a conditional', () => {
    const story = storyFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    choice.steps = [{ id: uid(), kind: 'condition', condition: always(), yes: [{ id: uid(), kind: 'end' }], no: [] }];
    expect(validateStory(story).some((i) => i.message.includes('path without'))).toBeTrue();
    choice.steps.push({ id: uid(), kind: 'end' });
    expect(validateStory(story)).toEqual([]);
  });
  it('projects every possible scene edge including merged branches and self-links', () => {
    const story = storyFixture();
    const edges = sceneEdges(story);
    expect(edges.filter((e) => e.from === story.start).length).toBe(3);
    expect(edges.some((e) => e.from === e.to)).toBeTrue();
  });
});
