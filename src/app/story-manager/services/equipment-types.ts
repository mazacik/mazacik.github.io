import { copy, Entity, resolveEquipment, Story } from '../models/story.model';

/** Preserve legacy definition/copy IDs while flattening chains into types and variants. */
const lockFields = ['lockable', 'lockOnEquip', 'keyItems', 'unlockMethods'] as const;

export function upgradeEquipmentTypes(story: Story): void {
  // Older explicit types could define locks. Materialize inherited settings on
  // equipment before removing them from the type, retaining method IDs for saves.
  for (const entity of story.entities.filter((e) => e.kind === 'equipment' && e.equipmentRole !== 'type')) {
    const type = story.entities.find((e) => e.id === entity.parentId && e.kind === 'equipment' && e.equipmentRole === 'type');
    if (!type) continue;
    for (const field of lockFields) {
      if (entity[field] === undefined && type[field] !== undefined) Object.assign(entity, { [field]: copy(type[field]) });
    }
  }
  for (const type of story.entities.filter((e) => e.kind === 'equipment' && e.equipmentRole === 'type')) {
    for (const field of lockFields) delete type[field];
  }
  const legacy = story.entities.filter((e) => e.kind === 'equipment' && !e.equipmentRole);
  if (!legacy.length) return;
  const original = copy(story);
  const typeIds = new Map<string, string>();
  const used = new Set<string>();
  const collectIds = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'id' && typeof child === 'string') used.add(child);
      else collectIds(child);
    }
  };
  collectIds(story);
  const rootFor = (entity: Entity): Entity => {
    const seen = new Set<string>();
    while (entity.parentId && !seen.has(entity.id)) {
      seen.add(entity.id);
      const parent = original.entities.find((e) => e.kind === 'equipment' && e.id === entity.parentId);
      if (!parent || parent.equipmentRole) break;
      entity = parent;
    }
    return entity;
  };
  for (const entity of legacy) {
    const root = rootFor(entity);
    let resolved: Entity, base: Entity;
    try {
      resolved = resolveEquipment(original, entity.id);
      base = resolveEquipment(original, root.id);
    } catch {
      // Keep invalid drafts repairable instead of discarding their unresolved references.
      entity.equipmentRole = 'variant';
      continue;
    }
    let typeId = typeIds.get(root.id);
    if (!typeId) {
      typeId = root.id + '-type';
      for (let suffix = 2; used.has(typeId); suffix++) typeId = root.id + '-type-' + suffix;
      used.add(typeId);
      typeIds.set(root.id, typeId);
      const type = { ...copy(base), id: typeId, equipmentRole: 'type' as const };
      delete type.parentId;
      delete type.propertyOverrides;
      for (const field of lockFields) delete type[field];
      story.entities.push(type);
    }
    const properties = new Map(base.properties.map((p) => [p.id, p]));
    entity.equipmentRole = 'variant';
    entity.parentId = typeId;
    entity.properties = copy(resolved.properties.filter((p) => !properties.has(p.id)));
    entity.propertyOverrides = Object.fromEntries(resolved.properties.filter((p) => properties.has(p.id) && p.initial !== properties.get(p.id).initial).map((p) => [p.id, p.initial]));
    for (const field of lockFields) Object.assign(entity, { [field]: copy(resolved[field]) });
    for (const field of ['requiredSlots'] as const) {
      if (JSON.stringify(resolved[field]) === JSON.stringify(base[field])) delete entity[field];
      else Object.assign(entity, { [field]: copy(resolved[field]) });
    }
    entity.flagGrants = [
      ...copy(resolved.flagGrants.filter((g) => !base.flagGrants.some((b) => JSON.stringify(b) === JSON.stringify(g)))),
      ...base.flagGrants.filter((b) => !resolved.flagGrants.some((g) => g.flag === b.flag)).map((b) => ({ ...b, suppressed: true })),
    ];
  }
}
