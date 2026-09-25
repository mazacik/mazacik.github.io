import { GameState, Story, equipmentSlots, referenceEntities } from '../models/story.model';

/** Reachability follows configured edges, never the display order of layers. */
export function coveredLayers(story: Story, layer: string): Set<string> {
  const covered = new Set<string>();
  const visit = (name: string) => {
    const targets = story.layerCoverage?.[name];
    for (const next of Array.isArray(targets) ? targets : []) {
      if (covered.has(next)) continue;
      covered.add(next);
      visit(next);
    }
  };
  visit(layer);
  return covered;
}

export function layerErrors(story: Story): string[] {
  const errors: string[] = [];
  if (new Set(story.slots).size !== story.slots.length || story.slots.some((s) => !s.trim())) errors.push('Equipment layers must have unique, nonempty names.');
  for (const [layer, covered] of Object.entries(story.layerCoverage ?? {})) {
    if (!story.slots.includes(layer) || !Array.isArray(covered) || covered.some((s) => !story.slots.includes(s))) {
      errors.push('Layer coverage refers to a missing layer.');
      continue;
    }
    if (covered.includes(layer)) errors.push(layer + ' cannot cover itself.');
  }
  if (!errors.length && story.slots.some((s) => coveredLayers(story, s).has(s))) errors.push('Layer coverage cannot contain a cycle.');
  return errors;
}

export function assertLayerAccess(story: Story, state: GameState, actor: string, target: string): void {
  const errors = layerErrors(story);
  if (errors.length) throw new Error(errors.join(' '));
  const entities = referenceEntities(story);
  const required = equipmentSlots(entities.find((e) => e.id === target));
  const equipped = new Set(Object.values(state.equipment[actor] ?? {}));
  const blockers = entities.filter(
    (e) =>
      e.id !== target &&
      equipped.has(e.id) &&
      equipmentSlots(e).some((s) => {
        const covered = coveredLayers(story, s);
        return required.some((layer) => covered.has(layer));
      }),
  );
  if (blockers.length) throw new Error('Blocked by ' + blockers.map((e) => e.name).join(', ') + '. Unequip covering equipment first.');
}
