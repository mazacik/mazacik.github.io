import { Entity, GameState, Issue, Story, copyEntity, resolveEquipment } from '../models/story.model';
import { copyDefinition } from './story-locks';
import { layerErrors } from './story-layers';

export function itemTargets(story: Story): Entity[] {
  return [
    ...story.entities.filter((e) => e.kind === 'object'),
    ...(story.copies ?? []).flatMap((c) => {
      try {
        return [copyEntity(story, c)];
      } catch {
        return [];
      }
    }),
  ];
}
export function quantity(state: GameState, actor: string, id: string): number {
  return state.quantities?.[actor]?.[id] ?? 0;
}
export function changeQuantity(state: GameState, actor: string, id: string, delta: number): void {
  const next = quantity(state, actor, id) + delta;
  if (!Number.isSafeInteger(next) || next < 0) throw new Error('Not enough carried items, or invalid quantity.');
  state.quantities ??= {};
  state.quantities[actor] ??= {};
  if (next) state.quantities[actor][id] = next;
  else delete state.quantities[actor][id];
}
export function takeOff(state: GameState, actor: string, slot: string): void {
  const id = state.equipment[actor]?.[slot];
  if (!id) return;
  for (const occupied of Object.keys(state.equipment[actor])) if (state.equipment[actor][occupied] === id) delete state.equipment[actor][occupied];
}
export function inventoryRows(story: Story, state: GameState, actor: string, wearing = false): (Entity & { quantity: number })[] {
  const equipped = new Set(Object.values(state.equipment[actor] ?? {}));
  return itemTargets(story).flatMap((e) => {
    if (e.kind === 'equipment' && state.copyStates?.[e.id]?.condition === 'destroyed') return [];
    if (e.kind === 'equipment') return state.copyStates?.[e.id]?.owner === actor && equipped.has(e.id) === wearing ? [{ ...e, quantity: 1 }] : [];
    const count = quantity(state, actor, e.id);
    return !wearing && count ? [{ ...e, quantity: count }] : [];
  });
}
export function inventoryIssues(story: Story): Issue[] {
  const issues: Issue[] = layerErrors(story).map((message) => ({ message }));
  const occupied = new Set<string>();
  for (const actor of story.entities)
    for (const row of actor.inventory ?? []) {
      const error = (message: string) => issues.push({ entity: actor.id, section: 'Inventory', message: actor.name + ': ' + message });
      if (actor.kind !== 'character') error('Only characters have starting inventories.');
      if (!story.entities.some((e) => e.kind === 'object' && e.id === row.target)) error('Select an existing Item definition. Equipment is assigned through copies.');
      if (!Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.equipped) error('Starting Items need a positive quantity and cannot be equipped.');
    }
  for (const instance of story.copies ?? []) {
    const error = (message: string) =>
      issues.push({
        entity: story.entities.some((e) => e.kind === 'character' && e.id === instance.owner) ? instance.owner : instance.definition,
        section: story.entities.some((e) => e.kind === 'character' && e.id === instance.owner) ? 'Equipment' : 'General',
        copy: instance.id,
        message: instance.name + ': ' + message,
      });
    if (!instance.id || story.copies.filter((c) => c.id === instance.id).length !== 1 || story.entities.some((e) => e.id === instance.id)) error('Copy IDs must be unique.');
    if (!instance.name.trim()) error('Copy needs a name.');
    if (instance.owner && !story.entities.some((e) => e.id === instance.owner && e.kind === 'character')) error('Starting owner is missing.');
    try {
      const definition = resolveEquipment(story, instance.definition);
      if (definition.equipmentRole === 'type') error('Equipment copies must use equipment, not a type.');
      if (instance.locked !== undefined && typeof instance.locked !== 'boolean') error('Starting lock state must be Boolean.');
      if (instance.locked && (!instance.equipped || !definition.lockable)) error('Only equipped, lockable copies can start locked.');
      if ((instance.keyItems ?? definition.keyItems ?? []).some((id) => !story.entities.some((e) => e.id === id && e.kind === 'object'))) error('Compatible keys must be existing Items.');
      for (const [id, value] of Object.entries(instance.values)) {
        const property = definition.properties.find((p) => p.id === id);
        if (!property || typeof value !== (property.type === 'text' ? 'string' : property.type) || (typeof value === 'number' && !Number.isFinite(value))) error('Invalid copy variable override.');
      }
      if (instance.equipped) {
        if (!instance.owner) error('Equipped copies need an owner.');
        if (!definition.requiredSlots.length || new Set(definition.requiredSlots).size !== definition.requiredSlots.length || definition.requiredSlots.some((s) => !story.slots.includes(s)))
          error('Starting equipment needs valid, distinct layers.');
        for (const slot of definition.requiredSlots) {
          const key = JSON.stringify([instance.owner, slot]);
          if (occupied.has(key)) error('Starting equipment overlaps another copy.');
          occupied.add(key);
        }
      }
    } catch (e) {
      error((e as Error).message);
    }
  }
  return issues;
}
