import { parseDocument, serializeArticles } from './story-document';
import { Data } from '../models/data.interface';
import { copy, newFlag, variableKey } from '../models/story.model';
import { storyFixture } from '../engine/story-fixture';
import { flagsFixture } from '../engine/story-flags-fixture';
import { initialState, startGame, writeVariable } from '../engine/story-engine';
import { upgradeEquipmentTypes } from './equipment-types';
import { hasFlag } from '../engine/story-flags';
import { locksFixture } from '../engine/story-locks-fixture';
import { playableFingerprint } from '../engine/story-order';
describe('Notes document compatibility', () => {
  it('classifies existing matching keys without changing saved inventory, references or gameplay revisions', () => {
    const story = locksFixture(),
      game = startGame(story, 'Saved');
    const source = { version: 4, articles: [], stories: [story], playthroughs: [game] };
    const before = copy(source);
    const parsed = parseDocument(source).data;
    const key = parsed.stories[0].entities.find((e) => e.id === 'apple');
    expect(key.key).toBeTrue();
    expect(parsed.playthroughs).toEqual(source.playthroughs);
    expect(parsed.stories[0].revision).toBe(story.revision);
    expect(playableFingerprint(parsed.stories[0])).toBe(playableFingerprint(story));
    expect(source).toEqual(before);
    expect(parseDocument(parsed).data).toEqual(parsed);
    parsed.stories[0].entities.forEach((e) => delete e.keyItems);
    parsed.stories[0].copies.forEach((c) => delete c.keyItems);
    expect(parseDocument(parsed).data.stories[0].entities.find((e) => e.id === key.id).key).toBeTrue();
  });
  it('retires computed rules while preserving variable identity, defaults and saved values', () => {
    const story = flagsFixture();
    story.flags.push({ ...newFlag(), id: 'weather', name: 'Weather', initial: true }, { ...newFlag(), id: 'mood', name: 'Mood', scope: 'character' });
    const game = startGame(story, 'Existing game');
    game.state.storyValues['weather'] = false;
    game.state.characterValues['player']['mood'] = true;
    const source = copy({ version: 4, articles: [], stories: [story], playthroughs: [game] });
    for (const flag of source.stories[0].flags) Object.assign(flag, { kind: 'computed', rule: { kind: 'flag', flag: 'removed-reference', children: [] } });
    const before = copy(source);
    const parsed = parseDocument(source).data;
    expect(source).toEqual(before);
    const expected = copy(story);
    upgradeEquipmentTypes(expected);
    expect(parsed.stories[0]).toEqual(expected);
    expect(parsed.playthroughs[0]).toEqual(game);
    expect(hasFlag(parsed.stories[0], parsed.playthroughs[0].state, '', 'weather')).toBeFalse();
    expect(hasFlag(parsed.stories[0], parsed.playthroughs[0].state, 'player', 'mood')).toBeTrue();
    const fresh = initialState(parsed.stories[0]);
    expect(hasFlag(parsed.stories[0], fresh, '', 'weather')).toBeTrue();
    expect(hasFlag(parsed.stories[0], fresh, 'player', 'mood')).toBeFalse();
    writeVariable(parsed.stories[0], fresh, variableKey('story', '', 'weather'), false);
    expect(hasFlag(parsed.stories[0], fresh, '', 'weather')).toBeFalse();
    expect(parseDocument(parsed).data).toEqual(parsed);
  });
  it('resets older gameplay data without mutating note records or containers', () => {
    const story = storyFixture(),
      game = startGame(story, 'Old');
    for (const version of [undefined, 1, 2, 3]) {
      const source = { ...copy(legacy), version, stories: [story], playthroughs: [game] };
      const before = copy(source),
        parsed = parseDocument(source);
      expect(parsed.data.version).toBe(4);
      expect(parsed.data.stories.find((s) => s.id === story.id).entities).toEqual([]);
      expect(parsed.data.stories.find((s) => s.id === story.id).scenes).toEqual([]);
      expect(parsed.data.playthroughs).toEqual([]);
      expect(serializeArticles(parsed.articles).slice(0, legacy.articles.length)).toEqual(legacy.articles);
      expect(parsed.articles.find((a) => a.id === 'idea').parent.id).toBe('nested');
      expect(copy(source)).toEqual(before);
      expect(parseDocument(parsed.data).data).toEqual(parsed.data);
    }
  });
  it('preserves authored flags and direct state through document serialization', () => {
    const story = flagsFixture(),
      game = startGame(story, 'Saved');
    game.state.characterValues['player']['bottom'] = true;
    const parsed = parseDocument(copy({ version: 4, articles: [], stories: [story], playthroughs: [game] })).data;
    expect(parsed.stories[0].flags).toEqual(story.flags);
    expect(hasFlag(parsed.stories[0], parsed.playthroughs[0].state, 'player', 'bottom')).toBeTrue();
    expect(parsed.playthroughs[0].state.directFlags).toEqual(game.state.directFlags);
  });
  const legacy: Data = {
    articles: [
      { id: 'story', title: 'Story', text: '', folder: true, childIds: ['nested', 'note'] },
      { id: 'nested', title: 'Research', text: '', folder: true, childIds: ['idea'] },
      { id: 'idea', title: 'Idea', text: 'A [[literal]] idea.\nKeep whitespace.  ', folder: false, childIds: [] },
      { id: 'note', title: 'Another', text: 'https://example.test', folder: false, childIds: [] },
      { id: 'loose', title: 'Unassigned', text: 'Do not move', folder: false, childIds: [] },
    ],
  };
  it('preserves legacy notes in a regular story and round-trips the normalized document', () => {
    const original = JSON.stringify(legacy),
      parsed = parseDocument(legacy);
    expect(parsed.data.stories.length).toBe(1);
    expect(parsed.data.playthroughs).toEqual([]);
    expect(serializeArticles(parsed.articles).slice(0, legacy.articles.length)).toEqual(legacy.articles);
    expect(JSON.stringify(legacy)).toBe(original);
    expect(parsed.articles.find((a) => a.id === 'idea').parent.id).toBe('nested');
    const recovered = parsed.articles.find((a) => a.id === 'loose').parent;
    expect(recovered.title).toBe('Recovered notes');
    expect(recovered.folder).toBeTrue();
    expect(parsed.data.stories[0].id).toBe(recovered.id);
    expect(parseDocument(parsed.data).data).toEqual(parsed.data);
    expect(serializeArticles(parseDocument(parsed.data).articles)).toEqual(serializeArticles(parsed.articles));
  });
  it('recovers loose notes without colliding with existing IDs or changing active games', () => {
    const story = parseDocument({ version: 4, articles: [], stories: [storyFixture()] }).data.stories[0],
      game = startGame(story, 'Keep playing');
    const source: Data = { ...copy(legacy), version: 4, stories: [story], playthroughs: [game] };
    source.articles.push({ id: 'recovered-notes', title: 'Existing story', text: '', folder: true, childIds: [] });
    const original = copy(source),
      parsed = parseDocument(source);
    const recovered = parsed.articles.find((a) => a.id === 'loose').parent;
    expect(recovered.id).toBe('recovered-notes-2');
    expect(parsed.articles.filter((a) => !a.parent).every((a) => a.folder)).toBeTrue();
    expect(parsed.data.stories[0].revision).toBe(story.revision);
    expect(parsed.data.playthroughs[0]).toEqual(game);
    expect(source).toEqual(original);
  });
  it('refuses malformed notes, duplicate IDs, missing children and cycles', () => {
    expect(() => parseDocument(null)).toThrow();
    expect(() => parseDocument({ articles: [...legacy.articles, legacy.articles[0]] })).toThrow();
    expect(() => parseDocument({ articles: [{ ...legacy.articles[0], childIds: ['missing'] }] })).toThrow();
    expect(() =>
      parseDocument({
        articles: [
          { ...legacy.articles[0], childIds: ['nested'] },
          { ...legacy.articles[1], childIds: ['story'] },
        ],
      }),
    ).toThrow();
  });
  it('preserves additional document fields and rejects future versions', () => {
    const data = { ...legacy, customField: 'preserve' };
    expect((parseDocument(data).data as typeof data).customField).toBe('preserve');
    expect(() => parseDocument({ ...legacy, version: 99 })).toThrow();
  });
});
