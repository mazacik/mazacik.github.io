import { Article } from '../models/article.class';
import { Data } from '../models/data.interface';
import { copy, newStory, Story } from '../models/story.model';
export const STORY_DOCUMENT_VERSION = 5;

export function parseDocument(input: Data): { data: Data; articles: Article[] } {
  if (!input || !Array.isArray(input.articles) || (input.version !== undefined && ![1, 2, 3, 4, STORY_DOCUMENT_VERSION].includes(input.version)))
    throw new Error('Unsupported story document. Nothing was overwritten.');
  const byId = new Map<string, Article>();
  for (const record of input.articles) {
    if (!record.id || byId.has(record.id) || typeof record.title !== 'string' || typeof record.text !== 'string' || typeof record.folder !== 'boolean' || !Array.isArray(record.childIds))
      throw new Error('Invalid note record. Nothing was overwritten.');
    const article = Object.assign(new Article(), { id: record.id, title: record.title, text: record.text, folder: record.folder, children: [], open: false });
    byId.set(record.id, article);
  }
  for (const record of input.articles) {
    const parent = byId.get(record.id);
    for (const id of record.childIds) {
      const child = byId.get(id);
      if (!child || child.parent || child === parent) throw new Error('Invalid note hierarchy. Nothing was overwritten.');
      child.parent = parent;
      parent.children.push(child);
    }
  }
  for (const article of byId.values()) {
    const seen = new Set<Article>();
    for (let cursor = article; cursor; cursor = cursor.parent) {
      if (seen.has(cursor)) throw new Error('Note hierarchy contains a cycle.');
      seen.add(cursor);
    }
  }
  if ((input.stories && !Array.isArray(input.stories)) || (input.playthroughs && !Array.isArray(input.playthroughs))) throw new Error('Invalid story collections.');
  input = copy(input);
  const legacy = input.version !== STORY_DOCUMENT_VERSION;
  const stories: Story[] = (input.stories ?? []).map((raw) => {
    if (!raw || typeof raw.id !== 'string' || !raw.id) throw new Error('Invalid story container.');
    return legacy ? newStory(raw.id) : raw;
  });
  // Reset retired gameplay while preserving every note and its container.
  const playthroughs = legacy ? [] : (input.playthroughs ?? []);
  const looseNotes = [...byId.values()].filter((article) => !article.folder && !article.parent);
  if (looseNotes.length) {
    const usedIds = new Set([...byId.keys(), ...stories.map((story) => story.id), ...playthroughs.map((game) => game.storyId)]);
    let id = 'recovered-notes';
    for (let suffix = 2; usedIds.has(id); suffix++) id = 'recovered-notes-' + suffix;
    const folder = Object.assign(new Article(), { id, title: 'Recovered notes', text: '', folder: true, children: looseNotes, open: false });
    looseNotes.forEach((note) => (note.parent = folder));
    byId.set(id, folder);
    stories.push(newStory(id));
  }
  const articles = [...byId.values()];
  return { data: { ...input, version: STORY_DOCUMENT_VERSION, articles: looseNotes.length ? serializeArticles(articles) : input.articles, stories, playthroughs }, articles };
}

export function serializeArticles(articles: Article[]): Data['articles'] {
  return articles.map((a) => ({ id: a.id, title: a.title, text: a.text, childIds: a.children.map((c) => c.id), folder: a.folder }));
}
