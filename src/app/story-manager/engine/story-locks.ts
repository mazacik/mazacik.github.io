import { Entity, GameState, Story, UnlockMethod, copy, parseVariableKey, resolveEquipment, variableKey, walkSteps } from '../models/story.model';

export const lockEffects = ['lockEquipment', 'unlockEquipment', 'breakEquipment', 'destroyEquipment', 'repairEquipment'];
export function equippedCopy(state: GameState, id: string): boolean {
  const owner = state.copyStates?.[id]?.owner;
  return !!owner && Object.values(state.equipment[owner] ?? {}).includes(id);
}
export function assertUnlocked(state: GameState, id: string) {
  if (state.copyStates?.[id]?.locked) throw new Error('Locked. Use an unlock method first.');
}
export function copyDefinition(story: Story, id: string) {
  const instance = story.copies?.find((c) => c.id === id);
  if (!instance) throw new Error('Choose an equipment copy.');
  const definition = resolveEquipment(story, instance.definition);
  if (definition.equipmentRole === 'type') throw new Error('Equipment copies must use equipment, not a type.');
  return definition;
}
export function unlockMethods(story: Story, id: string): UnlockMethod[] {
  try {
    const definition = copyDefinition(story, id);
    return definition.lockable ? definition.unlockMethods : [];
  } catch {
    return [];
  }
}
export const unlockRandomKey = (target: string, method: string, step = 'chance') => JSON.stringify(['unlock', target, method, step]);

/** A view for the existing reference pickers and validators; authored collections stay shared. */
export function unlockContextStory(story: Story, definition: string): Story {
  const character = (id: string, name: string): Entity => ({ id, name, kind: 'character', properties: [], description: '', notes: '', known: true });
  const variant: Entity[] = story.entities.some((e) => e.id === definition && e.equipmentRole === 'type')
    ? [{ id: '@equipment-variant', name: 'Example equipment', kind: 'equipment', equipmentRole: 'variant', parentId: definition, properties: [], description: '', notes: '', known: true }]
    : [];
  return {
    ...story,
    entities: [...story.entities, ...variant, character('@actor', 'Acting character'), character('@wearer', 'Wearer')],
    copies: [...(story.copies ?? []), { id: '@equipment', name: 'This equipment copy', definition: variant[0]?.id ?? definition, owner: '@wearer', equipped: false, values: {} }],
  };
}
export function bindUnlockMethod(method: UnlockMethod, actor: string, wearer: string, target: string): UnlockMethod {
  const refs: Record<string, string> = { '@actor': actor, '@wearer': wearer, '@equipment': target };
  const bind = (value: any, field = ''): any => {
    if (Array.isArray(value)) return value.map((v) => bind(v));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, bind(v, key)]));
    if (typeof value !== 'string' || !['actor', 'from', 'target'].includes(field)) return value;
    const ref = parseVariableKey(value);
    return ref ? variableKey(ref.scope, refs[ref.owner] ?? ref.owner, ref.variable) : (refs[value] ?? value);
  };
  return bind(copy(method));
}
export function methodShapeErrors(method: UnlockMethod): string[] {
  const errors: string[] = [];
  if (typeof method.requiresAccess !== 'boolean' || typeof method.requiresKey !== 'boolean') errors.push('Unlock requirements must use Boolean values.');
  if (!method.id || !method.label.trim()) errors.push('Unlock methods need an ID and label.');
  if (!Number.isFinite(method.chance) || method.chance < 0 || method.chance > 100) errors.push('Unlock success probability must be between 0 and 100.');
  if (!['unlock', 'unequip', 'break', 'destroy'].includes(method.result)) errors.push('Choose an unlock success result.');
  if (walkSteps([...method.costs, ...method.yes, ...method.no]).some((s) => s.kind === 'unlock')) errors.push('Unlock methods cannot invoke other unlock attempts.');
  if (walkSteps(method.costs).some((s) => s.kind === 'go' || s.kind === 'end')) errors.push('Attempt costs cannot change the passage or end the story.');
  return errors;
}
