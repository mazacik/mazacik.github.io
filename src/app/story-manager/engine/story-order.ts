import { Condition, copy, Step, Story } from '../models/story.model';
export function moveEntry<T>(items: T[], index: number, offset: number): boolean {
  const next = index + offset;
  if (!Number.isInteger(index) || !Number.isInteger(next) || index < 0 || next < 0 || index >= items.length || next >= items.length || index === next) return false;
  items.splice(next, 0, items.splice(index, 1)[0]);
  return true;
}
export function playableFingerprint(story: Story): string {
  const result = copy(story);
  const sort = <T>(items: T[]) => items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  result.revision = 0;
  const rules = (rule: Condition) => {
    rule.children?.forEach(rules);
    if (rule.kind === 'all' || rule.kind === 'any') sort<Condition>(rule.children);
  };
  const steps = (items: Step[]) =>
    items.forEach((s) => {
      if (s.kind === 'condition') {
        rules(s.condition);
        steps(s.yes);
        steps(s.no);
      }
      if (s.kind === 'random') s.branches.forEach((b) => steps(b.steps));
    });
  result.scenes.forEach((s) => {
    s.noteIds = [];
    s.passages.forEach((p) =>
      p.choices.forEach((c) => {
        c.repeatable = c.repeatable === true;
        rules(c.available);
        steps(c.steps);
      }),
    );
    sort(s.passages);
  });
  sort(result.scenes);
  if (result.flags) sort(result.flags);
  const stable = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, v]) => [key, stable(v)]),
          )
        : value;
  return JSON.stringify(stable(result));
}
