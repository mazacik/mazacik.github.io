import { GameState, Issue, Story } from '../models/story.model';
export function hasFlag(story: Story, state: GameState, id: string): boolean {
  const flag = story.flags.find((v) => v.id === id);
  if (!flag || flag.type !== 'boolean') throw new Error('Boolean variable is missing or has the wrong type.');
  return (state.storyValues[id] ?? flag.initial) === true;
}
export function validateFlags(story: Story): Issue[] {
  const issues: Issue[] = [];
  for (const flag of story.flags) {
    const error = (message: string) => issues.push({ message: flag.name + ': ' + message, flag: flag.id });
    if (!flag.name.trim()) error('Variable needs a name.');
    if (!flag.id || story.flags.filter((v) => v.id === flag.id).length !== 1) error('Variable IDs must be unique.');
    if (
      !['text', 'number', 'boolean'].includes(flag.type) ||
      typeof flag.initial !== (flag.type === 'text' ? 'string' : flag.type) ||
      (typeof flag.initial === 'number' && !Number.isFinite(flag.initial))
    )
      error('Variable default has the wrong type.');
    if (typeof flag.visible !== 'boolean') error('Reader visibility must be Boolean.');
  }
  return issues;
}
