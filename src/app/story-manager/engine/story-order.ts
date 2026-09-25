import { Condition, copy, resolveEquipment, Step, Story } from '../models/story.model';
export function moveEntry<T>(items: T[], index: number, offset: number): boolean {
  const next = index + offset;
  if (!Number.isInteger(index) || !Number.isInteger(next) || index < 0 || next < 0 || index >= items.length || next >= items.length || index === next) return false;
  items.splice(next, 0, items.splice(index, 1)[0]);
  return true;
}
export function playableFingerprint(story: Story): string {
  const result = copy(story);
  result.entities = result.entities
    .filter((e) => e.equipmentRole !== 'type')
    .map((e) => {
      if (e.kind !== 'equipment') return e;
      try {
        const resolved = resolveEquipment(story, e.id);
        delete resolved.parentId;
        delete resolved.propertyOverrides;
        delete resolved.equipmentRole;
        return copy(resolved);
      } catch {
        return e;
      }
    });
  const sort = <T>(items: T[]) => items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  result.revision = 0;
  result.slots.sort();
  result.layerCoverage = Object.fromEntries(
    Object.entries(result.layerCoverage ?? {})
      .filter(([, targets]) => targets.length)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([layer, targets]) => [layer, [...new Set(targets)].sort()]),
  );
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
  result.entities.forEach((e) => {
    // The key editor category does not change inventory or gameplay behavior.
    delete e.key;
    e.notes = '';
    sort(e.properties);
    if (e.keyItems) e.keyItems.sort();
    if (e.unlockMethods) {
      e.unlockMethods.forEach((m) => {
        rules(m.available);
        rules(m.success);
        steps(m.costs);
        steps(m.yes);
        steps(m.no);
      });
      sort(e.unlockMethods);
    }
    if (e.requiredSlots) e.requiredSlots.sort();
    if (e.inventory) sort(e.inventory);
    if (e.flagGrants) sort(e.flagGrants);
    if (e.initialFlags) e.initialFlags.sort();
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
  if (result.copies) {
    result.copies.forEach((c) => c.keyItems?.sort());
    sort(result.copies);
  }
  sort(result.entities);
  sort(result.scenes);
  sort(result.properties);
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
