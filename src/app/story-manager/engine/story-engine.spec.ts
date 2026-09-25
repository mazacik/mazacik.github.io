import { applyEffect, check, choose, initialState, renderText, startGame } from './story-engine';
import { sceneEdges, validateStory } from './story-validation';
import { storyFixture } from './story-fixture';
import { always, copy, newChoice, Step, uid } from '../models/story.model';

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
    expect(game.state.equipment['player']['Body']).toBe('coat-copy');
    game.state.quantities['player']['key'] = 0;
    expect(initialState(story).quantities['player']['key']).toBe(1);
  });
  it('evaluates clothing before randomness and handles the 50% boundary', () => {
    const story = storyFixture(),
      game = startGame(story, 'Test');
    const choice = story.scenes[0].passages[0].choices[0];
    expect(choose(story, game, choice.id, () => 0).scene).toBe(story.scenes[2].id);
    expect(choose(story, game, choice.id, () => 0.499999).scene).toBe(story.scenes[2].id);
    expect(choose(story, game, choice.id, () => 0.5).scene).toBe(story.scenes[1].id);
    expect(choose(story, game, choice.id, () => 0.99999).scene).toBe(story.scenes[1].id);
    game.state.equipment['player'] = {};
    const random = jasmine.createSpy().and.returnValue(0);
    expect(choose(story, game, choice.id, random).scene).toBe(story.scenes[1].id);
    expect(random).not.toHaveBeenCalled();
  });
  it('supports nested checks inside a random outcome and ordered effects', () => {
    const story = storyFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    choice.steps = [
      { id: uid(), kind: 'effect', effect: { kind: 'set', target: 'secret', actor: '', value: true } },
      {
        id: uid(),
        kind: 'random',
        branches: [
          {
            id: uid(),
            percent: 100,
            steps: [{ id: uid(), kind: 'condition', condition: { ...always(), kind: 'property', target: 'secret', value: true }, yes: [{ id: uid(), kind: 'end' }], no: [] }],
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
      { id: uid(), kind: 'effect', effect: { kind: 'transferQuantity', target: 'key', from: 'player', actor: 'Mira', value: 1 } },
      { id: uid(), kind: 'go', scene: 'deleted', passage: '' },
    ];
    expect(() => choose(story, game, choice.id)).toThrow();
    expect(game).toEqual(original);
  });
  it('resumes exact passage, ownership, and results after serialization', () => {
    const story = storyFixture();
    let game = choose(story, startGame(story, 'Test'), story.scenes[0].passages[0].choices[0].id, () => 0.1);
    game = choose(story, game, story.scenes[2].passages[0].choices[0].id);
    const resumed = copy(game);
    expect(resumed.passage).toBe(story.scenes[2].passages[1].id);
    expect(resumed.state.quantities['Mira']['key']).toBe(1);
    expect(resumed.state.values['trust']).toBe(1);
    expect(resumed.trace.some((line) => line.includes('draw 0.1'))).toBeTrue();
    expect(resumed.transcript[0].parts.some((part) => part.text === 'Unknown')).toBeTrue();
    expect(game.transcript[0]).toEqual(resumed.transcript[0]);
  });
  it('supports all, any, not, numeric, ownership, knowledge, and choice checks', () => {
    const story = storyFixture(),
      state = initialState(story);
    expect(
      check(
        {
          ...always(),
          kind: 'all',
          children: [
            { ...always(), kind: 'owns', target: 'key', actor: 'player' },
            { ...always(), kind: 'property', target: 'trust', op: 'gte', value: 0 },
          ],
        },
        state,
        story,
      ),
    ).toBeTrue();
    expect(check({ ...always(), kind: 'not', children: [{ ...always(), kind: 'known', target: 'Mira' }] }, state, story)).toBeTrue();
    expect(check({ ...always(), kind: 'any', children: [{ ...always(), kind: 'chosen', target: 'missing' }, always()] }, state, story)).toBeTrue();
  });
  it('requires ownership to equip, replaces clothing, and transfers carried quantities', () => {
    const story = storyFixture(),
      state = initialState(story);
    story.entities.push({ ...copy(story.entities.find((e) => e.id === 'coat')), id: 'coat2' });
    story.copies.push({ id: 'coat2-copy', definition: 'coat2', name: 'Second coat', owner: 'player', equipped: false, values: {} });
    state.copyStates['coat2-copy'] = { owner: 'player', values: {} };
    applyEffect(story, state, { kind: 'equip', target: 'coat2-copy', actor: 'player', value: '' });
    expect(state.equipment['player']['Body']).toBe('coat2-copy');
    applyEffect(story, state, { kind: 'unequip', target: 'coat2-copy', actor: 'player', value: '' });
    applyEffect(story, state, { kind: 'transferEquipment', target: 'coat2-copy', from: 'player', actor: 'Mira', value: 1 });
    expect(state.equipment['player']['Body']).toBeUndefined();
    expect(() => applyEffect(story, state, { kind: 'equip', target: 'coat2-copy', actor: 'player', value: '' })).toThrow();
  });
  it('rejects unavailable choices and stale or canceled games', () => {
    const story = storyFixture(),
      game = startGame(story, 'Test'),
      choice = story.scenes[0].passages[0].choices[0];
    choice.available = { ...always(), kind: 'known', target: 'Mira' };
    expect(() => choose(story, game, choice.id)).toThrowError('That choice is unavailable.');
    choice.available = always();
    story.revision++;
    expect(() => choose(story, game, choice.id)).toThrow();
    story.revision--;
    game.status = 'canceled';
    expect(() => choose(story, game, choice.id)).toThrow();
  });
  it('keeps IDs after renaming and protects unknown property values and HTML', () => {
    const story = storyFixture(),
      state = initialState(story);
    story.entities.find((e) => e.id === 'Mira').name = 'Renamed';
    const parts = renderText('<script>bad()</script> [[character:Mira]] [[property:trust]]', story, state);
    expect(parts[0].text).toBe('<script>bad()</script> ');
    expect(parts.some((p) => p.entity === 'Mira' && p.text === 'Renamed')).toBeTrue();
    expect(parts.some((p) => p.text === 'Unknown')).toBeTrue();
    state.known.push('Mira');
    expect(renderText('[[property:trust]]', story, state)).toEqual([{ text: '0' }]);
  });
  it('validates missing references, destinations, percentages, and unreachable steps', () => {
    const story = storyFixture(),
      choice = story.scenes[0].passages[0].choices[0];
    const random = choice.steps[0].kind === 'condition' ? choice.steps[0].yes[0] : null;
    if (random?.kind === 'random') random.branches[0].percent = 25;
    story.scenes[0].passages[0].text = '[[object:deleted]]';
    choice.steps.push({ id: uid(), kind: 'go', scene: 'deleted', passage: '' });
    const messages = validateStory(story)
      .map((i) => i.message)
      .join(' ');
    expect(messages).toContain('totaling 100');
    expect(messages).toContain('missing reference');
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
