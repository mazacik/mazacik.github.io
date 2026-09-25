import { quantity } from './story-inventory';
import { isItem, equipmentSlots, FlagDefinition, GameState, Issue, Story, referenceEntities, variableScope, variableType, variableDefault, resolveEquipment } from '../models/story.model';

export interface FlagStatus {
  flag: FlagDefinition;
  active: boolean;
  sources: string[];
  explanation: string;
}

// A resolver lives for one evaluation only: later effects must see the new state.
export function createFlagResolver(story: Story, state: GameState, actor: string): (id: string) => FlagStatus {
  if (actor && !story.entities.some((e) => e.id === actor && e.kind === 'character')) throw new Error('Variable checks require an existing character.');
  const definitions = new Map((story.flags ?? []).map((f) => [f.id, f]));
  const cache = new Map<string, FlagStatus>();
  const resolve = (id: string): FlagStatus => {
    if (cache.has(id)) return cache.get(id);
    const flag = definitions.get(id);
    if (!flag || variableType(flag) !== 'boolean' || variableScope(flag) !== (actor ? 'character' : 'story')) throw new Error('Boolean variable reference has the wrong scope or type.');
    const direct = actor ? (state.characterValues?.[actor]?.[id] ?? state.directFlags?.[actor]?.includes(id) ?? variableDefault(flag)) : (state.storyValues?.[id] ?? variableDefault(flag));
    const sources = direct ? ['Direct value'] : [];
    for (const object of referenceEntities(story).filter(
      (e) => actor && ((e.kind === 'object' && quantity(state, actor, e.id) > 0) || (e.kind === 'equipment' && state.copyStates?.[e.id]?.owner === actor)),
    )) {
      for (const grant of object.flagGrants ?? []) {
        if (
          grant.flag === id &&
          (grant.when === 'owned' ||
            (grant.when === 'equipped' && equipmentSlots(object).length > 0 && equipmentSlots(object).every((slot) => story.slots.includes(slot) && state.equipment[actor]?.[slot] === object.id)))
        ) {
          sources.push(object.name + (grant.when === 'owned' ? ' (owned)' : ' (equipped)'));
        }
      }
    }
    const status: FlagStatus = { flag, active: sources.length > 0, sources: [...new Set(sources)], explanation: sources.length ? [...new Set(sources)].join(', ') : 'No active source' };
    cache.set(id, status);
    return status;
  };
  return resolve;
}

export function hasFlag(story: Story, state: GameState, actor: string, id: string): boolean {
  return createFlagResolver(story, state, actor)(id).active;
}

export function flagStatuses(story: Story, state: GameState, actor: string): FlagStatus[] {
  const resolve = createFlagResolver(story, state, actor);
  return (story.flags ?? []).filter((f) => variableType(f) === 'boolean' && variableScope(f) === (actor ? 'character' : 'story')).map((f) => resolve(f.id));
}

export function validateFlags(story: Story): Issue[] {
  const issues: Issue[] = [];
  const flags = story.flags ?? [];
  const definitions = new Map(flags.map((f) => [f.id, f]));
  const standard = (id: string) => {
    const v = definitions.get(id);
    return !!v && variableType(v) === 'boolean' && variableScope(v) === 'character';
  };
  for (const flag of flags) {
    const error = (message: string) => issues.push({ message: flag.name + ': ' + message, flag: flag.id });
    if (!flag.name.trim()) error('Variable needs a name.');
    if (!['story', 'character'].includes(variableScope(flag))) error('Choose a variable scope.');
    if (
      !['boolean', 'number', 'text'].includes(variableType(flag)) ||
      typeof variableDefault(flag) !== (variableType(flag) === 'text' ? 'string' : variableType(flag)) ||
      (typeof variableDefault(flag) === 'number' && !Number.isFinite(variableDefault(flag)))
    )
      error('Variable default has the wrong type.');
    if (!flag.id || flags.filter((f) => f.id === flag.id).length > 1) error('Variable IDs must be unique.');
  }
  for (const raw of story.entities) {
    let entity = raw;
    if (raw.kind === 'equipment') {
      try {
        entity = resolveEquipment(story, raw.id);
      } catch {
        continue;
      }
    }
    for (const [id, value] of Object.entries(entity.variableValues ?? {})) {
      const v = definitions.get(id);
      if (
        entity.kind !== 'character' ||
        !v ||
        variableScope(v) !== 'character' ||
        typeof value !== (variableType(v) === 'text' ? 'string' : variableType(v)) ||
        (typeof value === 'number' && !Number.isFinite(value))
      )
        issues.push({ entity: entity.id, section: 'Variables', message: entity.name + ': Invalid starting variable override.' });
    }
    const error = (message: string) => issues.push({ message: entity.name + ': ' + message, entity: entity.id, section: entity.kind === 'character' ? 'Variables' : 'Effects' });
    if ((entity.initialFlags ?? []).length && entity.kind !== 'character') error('Only characters can have starting Boolean values.');
    for (const id of entity.initialFlags ?? []) if (!standard(id)) error('Starting Boolean values must reference existing stored Character Boolean variables.');
    if ((entity.flagGrants ?? []).length && !isItem(entity)) error('Only items can grant Boolean values.');
    for (const grant of entity.flagGrants ?? []) {
      if (!standard(grant.flag)) error('Item grants must reference existing stored Character Boolean variables.');
      if (!['owned', 'equipped'].includes(grant.when)) error('Grant must apply while owned or equipped.');
      if (grant.when === 'equipped' && (!equipmentSlots(entity).length || equipmentSlots(entity).some((slot) => !story.slots.includes(slot))))
        error('An equipped Boolean grant needs an equipment slot.');
    }
  }
  return issues;
}
