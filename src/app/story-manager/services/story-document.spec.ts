import { parseDocument, serializeArticles } from './story-document';
import { Data } from '../models/data.interface';
import { copy, newStory, variableKey } from '../models/story.model';
import { storyFixture } from '../engine/story-fixture';
import { startGame, choose, writeVariable } from '../engine/story-engine';
describe('Story documents', () => {
  it('resets all older gameplay while preserving notes and containers exactly', () => {
    const story = storyFixture(),
      game = startGame(story, 'Old');
    for (const version of [undefined, 1, 2, 3, 4]) {
      const source = { ...copy(legacy), version, stories: [story], playthroughs: [game] };
      const before = copy(source),
        parsed = parseDocument(source);
      expect(parsed.data.version).toBe(5);
      expect(parsed.data.stories.find((s) => s.id === story.id)).toEqual(newStory(story.id));
      expect(parsed.data.playthroughs).toEqual([]);
      expect(serializeArticles(parsed.articles).slice(0, legacy.articles.length)).toEqual(legacy.articles);
      expect(parsed.articles.find((a) => a.id === 'idea').parent.id).toBe('nested');
      expect(copy(source)).toEqual(before);
      expect(parseDocument(parsed.data).data).toEqual(parsed.data);
    }
  });
  it('ignores retired gameplay fields in a version-4 document', () => {
    const raw = { id: 'story', entities: null, copies: [{ invalid: true }], scenes: null, flags: null, player: 'removed' };
    const source = { version: 4, articles: [], stories: [raw], playthroughs: [{ state: null }] };
    const before = copy(source);
    const parsed = parseDocument(source as unknown as Data).data;
    expect(parsed.stories).toEqual([newStory('story')]);
    expect(parsed.playthroughs).toEqual([]);
    expect(source).toEqual(before);
  });
  it('round-trips new variables, scenes and saved progress without resetting them', () => {
    const story = storyFixture(),
      game = startGame(story, 'Saved');
    writeVariable(story, game.state, variableKey('weather'), 'Rain');
    const source = { version: 5, articles: [], stories: [story], playthroughs: [game] };
    const parsed = parseDocument(copy(source)).data;
    expect(parsed).toEqual(source);
    expect(parseDocument(parsed).data).toEqual(parsed);
    expect(choose(parsed.stories[0], parsed.playthroughs[0], story.scenes[0].passages[0].choices[0].id, () => 0.75).state.storyValues['weather']).toBe('Rain');
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
    const story = parseDocument({ version: 5, articles: [], stories: [storyFixture()] }).data.stories[0],
      game = startGame(story, 'Keep playing');
    const source: Data = { ...copy(legacy), version: 5, stories: [story], playthroughs: [game] };
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
