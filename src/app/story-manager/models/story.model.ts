export type Value = string | number | boolean;
export interface FlagDefinition {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  scope?: 'story' | 'character';
  type?: Property['type'];
  initial?: Value;
}
export interface FlagGrant {
  flag: string;
  when: 'owned' | 'equipped';
  suppressed?: boolean;
}
export interface Property {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean';
  initial: Value;
  known: boolean;
}
export interface Entity {
  id: string;
  kind: 'character' | 'object' | 'equipment';
  /** Keys share quantity/inventory behavior with items but have their own editor category. */
  key?: boolean;
  equipmentRole?: 'type' | 'variant';
  name: string;
  description: string;
  notes: string;
  known: boolean;
  properties: Property[];
  /** All of these named layers are occupied together; used only by Equipment. */
  requiredSlots?: string[];
  lockable?: boolean;
  lockOnEquip?: boolean;
  keyItems?: string[];
  unlockMethods?: UnlockMethod[];
  parentId?: string;
  propertyOverrides?: Record<string, Value>;
  variableValues?: Record<string, Value>;
  initialFlags?: string[];
  flagGrants?: FlagGrant[];
  inventory?: StartingItem[];
}
export interface UnlockMethod {
  id: string;
  label: string;
  available: Condition;
  explanation: string;
  requiresAccess: boolean;
  requiresKey: boolean;
  success: Condition;
  chance: number;
  costs: Step[];
  result: 'unlock' | 'unequip' | 'break' | 'destroy';
  successMessage: string;
  failureMessage: string;
  yes: Step[];
  no: Step[];
}
export interface EquipmentCopy {
  id: string;
  definition: string;
  name: string;
  owner: string;
  equipped: boolean;
  locked?: boolean;
  keyItems?: string[];
  values: Record<string, Value>;
}
export interface EquipmentCopyState {
  owner: string;
  locked?: boolean;
  condition?: 'intact' | 'broken' | 'destroyed';
  values: Record<string, Value>;
}
export interface StartingItem {
  id: string;
  target: string;
  quantity: number;
  equipped: boolean;
}
export interface Story {
  id: string;
  revision: number;
  start: string;
  player: string;
  slots: string[];
  layerCoverage?: Record<string, string[]>;
  properties: Property[];
  entities: Entity[];
  scenes: Scene[];
  flags?: FlagDefinition[];
  copies?: EquipmentCopy[];
}
export interface Scene {
  id: string;
  title: string;
  entry: string;
  passages: Passage[];
  noteIds: string[];
}
export interface Passage {
  id: string;
  title: string;
  speaker: string;
  text: string;
  choices: Choice[];
}
export interface Choice {
  id: string;
  label: string;
  repeatable?: boolean;
  available: Condition;
  unavailable: 'hidden' | 'disabled';
  explanation: string;
  steps: Step[];
}
export interface Condition {
  kind: 'always' | 'all' | 'any' | 'not' | 'property' | 'owns' | 'wears' | 'known' | 'chosen' | 'flag' | 'quantity' | 'locked' | 'broken' | 'destroyed';
  children: Condition[];
  target: string;
  actor: string;
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  value: Value;
}
export interface Effect {
  kind:
    | 'set'
    | 'add'
    | 'equip'
    | 'unequip'
    | 'reveal'
    | 'addFlag'
    | 'removeFlag'
    | 'giveQuantity'
    | 'removeQuantity'
    | 'transferQuantity'
    | 'giveEquipment'
    | 'removeEquipment'
    | 'transferEquipment'
    | 'lockEquipment'
    | 'unlockEquipment'
    | 'breakEquipment'
    | 'destroyEquipment'
    | 'repairEquipment';
  target: string;
  actor: string;
  value: Value;
  from?: string;
  ignoreLayering?: boolean;
}
export type Step =
  | { id: string; kind: 'unlock'; target: string; actor: string; method: string }
  | { id: string; kind: 'effect'; effect: Effect }
  | { id: string; kind: 'condition'; condition: Condition; yes: Step[]; no: Step[] }
  | { id: string; kind: 'random'; branches: { id: string; percent: number; steps: Step[] }[] }
  | { id: string; kind: 'go'; scene: string; passage: string }
  | { id: string; kind: 'end' };
export interface GameState {
  values: Record<string, Value>;
  equipment: Record<string, Record<string, string>>;
  known: string[];
  chosen: string[];
  directFlags?: Record<string, string[]>;
  quantities?: Record<string, Record<string, number>>;
  storyValues?: Record<string, Value>;
  characterValues?: Record<string, Record<string, Value>>;
  copyStates?: Record<string, EquipmentCopyState>;
}
export interface TextPart {
  text: string;
  entity?: string;
}
export interface Transcript {
  kind?: 'passage' | 'equipmentAttempt' | 'equipmentAction';
  action?: string;
  attempt?: { target: string; actor: string; method: string; succeeded: boolean };
  scene: string;
  passage: string;
  speaker: string;
  parts: TextPart[];
  choice?: string;
}
export interface Playthrough {
  id: string;
  storyId: string;
  revision: number;
  name: string;
  status: 'active' | 'ended' | 'canceled';
  scene: string;
  passage: string;
  state: GameState;
  transcript: Transcript[];
  trace: string[];
  created: string;
}
export type EntityDetailSection = 'General' | 'Variables' | 'Effects' | 'Locks' | 'Inventory' | 'Equipment' | 'Unlocks';
export interface Issue {
  section?: EntityDetailSection;
  copy?: string;
  message: string;
  scene?: string;
  passage?: string;
  flag?: string;
  entity?: string;
}
export const uid = (): string => crypto.randomUUID();
export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const always = (): Condition => ({ kind: 'always', children: [], target: '', actor: '', op: 'eq', value: '' });
export const newUnlockMethod = (): UnlockMethod => ({
  id: uid(),
  label: 'Unlock',
  available: always(),
  explanation: 'Requirements are not met.',
  requiresAccess: true,
  requiresKey: false,
  success: always(),
  chance: 100,
  costs: [],
  result: 'unequip',
  successMessage: 'Unlocked.',
  failureMessage: 'The attempt failed.',
  yes: [],
  no: [],
});
export const newPassage = (): Passage => ({ id: uid(), title: 'New passage', speaker: '', text: '', choices: [] });
export function newScene(): Scene {
  const p = newPassage();
  return { id: uid(), title: 'New scene', entry: p.id, passages: [p], noteIds: [] };
}
export const newChoice = (): Choice => ({ id: uid(), label: 'Continue', repeatable: false, available: always(), unavailable: 'disabled', explanation: '', steps: [] });
export const newStory = (id: string): Story => ({
  id,
  revision: 0,
  start: '',
  player: '',
  slots: ['Underclothes', 'Clothing', 'Armour', 'Outerwear'],
  layerCoverage: {},
  properties: [],
  entities: [],
  scenes: [],
  flags: [],
  copies: [],
});
export const newFlag = (): FlagDefinition => ({
  id: uid(),
  name: 'New variable',
  description: '',
  scope: 'story',
  type: 'boolean',
  initial: false,
  visible: false,
});
export const variableType = (v: FlagDefinition): Property['type'] => v.type ?? 'boolean';
export const variableScope = (v: FlagDefinition): 'story' | 'character' => v.scope ?? 'character';
export const variableDefault = (v: FlagDefinition): Value => v.initial ?? (variableType(v) === 'boolean' ? false : variableType(v) === 'number' ? 0 : '');
export type VariableReference = { scope: 'story' | 'character' | 'copy'; owner: string; variable: string };
export const variableKey = (scope: VariableReference['scope'], owner: string, variable: string): string => 'v/' + encodeURIComponent(JSON.stringify([scope, owner, variable]));
export function parseVariableKey(key: string): VariableReference | undefined {
  if (!key.startsWith('v/')) return undefined;
  try {
    const [scope, owner, variable] = JSON.parse(decodeURIComponent(key.slice(2)));
    if (['story', 'character', 'copy'].includes(scope) && typeof owner === 'string' && typeof variable === 'string') return { scope, owner, variable };
  } catch {
    /* Invalid references are reported by validation. */
  }
  return undefined;
}
export function resolveEquipment(story: Story, id: string, visiting = new Set<string>()): Entity {
  const entity = story.entities.find((e) => e.id === id && e.kind === 'equipment');
  if (!entity) throw new Error('Missing equipment definition.');
  if (entity.equipmentRole !== undefined && !['type', 'variant'].includes(entity.equipmentRole)) throw new Error('Invalid equipment role.');
  if (entity.equipmentRole === 'type' && entity.parentId) throw new Error('Equipment types cannot inherit from other equipment.');
  if (entity.equipmentRole === 'variant' && !story.entities.some((e) => e.id === entity.parentId && e.kind === 'equipment' && e.equipmentRole === 'type'))
    throw new Error('Choose a type for this equipment.');
  if (visiting.has(id)) throw new Error('Circular equipment inheritance.');
  visiting.add(id);
  const parent = entity.parentId ? resolveEquipment(story, entity.parentId, visiting) : undefined;
  const properties = new Map((parent?.properties ?? []).map((p) => [p.id, { ...p }]));
  for (const p of entity.properties) {
    if (properties.has(p.id)) throw new Error('Inherited variables must use value overrides.');
    properties.set(p.id, { ...p });
  }
  for (const [id, value] of Object.entries(entity.propertyOverrides ?? {})) {
    const property = properties.get(id);
    if (!property || !parent?.properties.some((p) => p.id === id)) throw new Error('Override refers to a missing inherited variable.');
    property.initial = value;
  }
  const grants = new Map((parent?.flagGrants ?? []).map((g) => [g.flag, { ...g }]));
  for (const grant of entity.flagGrants ?? []) {
    if (grant.suppressed) grants.delete(grant.flag);
    // Older templates may store "owned"; equipment effects now require wearing it.
    else grants.set(grant.flag, { ...grant, when: grant.when === 'owned' ? 'equipped' : grant.when });
  }
  return {
    ...entity,
    // Legacy chains are resolved during import; types never supply lock settings.
    lockable: entity.equipmentRole === 'type' ? false : (entity.lockable ?? (!entity.equipmentRole ? parent?.lockable : undefined) ?? false),
    lockOnEquip: entity.equipmentRole === 'type' ? false : (entity.lockOnEquip ?? (!entity.equipmentRole ? parent?.lockOnEquip : undefined) ?? false),
    keyItems: entity.equipmentRole === 'type' ? [] : (entity.keyItems ?? (!entity.equipmentRole ? parent?.keyItems : undefined) ?? []),
    unlockMethods: entity.equipmentRole === 'type' ? [] : (entity.unlockMethods ?? (!entity.equipmentRole ? parent?.unlockMethods : undefined) ?? []),
    requiredSlots: entity.requiredSlots ?? parent?.requiredSlots ?? [],
    properties: [...properties.values()],
    flagGrants: [...grants.values()],
  };
}
export function copyEntity(story: Story, instance: EquipmentCopy): Entity {
  const definition = resolveEquipment(story, instance.definition);
  if (definition.equipmentRole === 'type') throw new Error('Equipment copies must use equipment, not a type.');
  return {
    ...definition,
    id: instance.id,
    name: instance.name,
    properties: definition.properties.map((p) => ({ ...p, id: variableKey('copy', instance.id, p.id), initial: instance.values[p.id] ?? p.initial })),
  };
}
export function allProperties(story: Story): { property: Property; label: string }[] {
  return [
    ...story.properties.map((property) => ({ property, label: `Story · ${property.name}` })),
    ...story.entities.filter((e) => e.kind !== 'equipment').flatMap((e) => e.properties.map((property) => ({ property, label: `${e.name} · ${property.name}` }))),
    ...(story.flags ?? []).flatMap((v) => {
      const actors = variableScope(v) === 'story' ? [{ id: '', name: 'Story' }] : story.entities.filter((e) => e.kind === 'character');
      return actors.map((actor) => ({
        property: {
          id: variableKey(variableScope(v), actor.id, v.id),
          name: v.name,
          type: variableType(v),
          initial: actor.id ? (story.entities.find((e) => e.id === actor.id)?.variableValues?.[v.id] ?? variableDefault(v)) : variableDefault(v),
          known: v.visible,
        },
        label: `${actor.name} · ${v.name}`,
      }));
    }),
    ...(story.copies ?? []).flatMap((instance) => {
      try {
        return copyEntity(story, instance).properties.map((property) => ({ property, label: `${instance.name} · ${property.name}` }));
      } catch {
        return [];
      }
    }),
  ];
}
export function referenceEntities(story: Story): Entity[] {
  return [
    ...story.entities.filter((e) => e.equipmentRole !== 'type'),
    ...(story.copies ?? []).flatMap((instance) => {
      try {
        return [copyEntity(story, instance)];
      } catch {
        return [];
      }
    }),
  ];
}
export function mutableProperties(story: Story) {
  const fixed = new Set(story.entities.filter((e) => e.kind === 'object').flatMap((e) => e.properties.map((p) => p.id)));
  return allProperties(story).filter((p) => !fixed.has(p.property.id));
}
export function walkSteps(steps: Step[]): Step[] {
  return steps.flatMap((s) => [s, ...(s.kind === 'condition' ? [...walkSteps(s.yes), ...walkSteps(s.no)] : s.kind === 'random' ? s.branches.flatMap((b) => walkSteps(b.steps)) : [])]);
}

export function isItem(entity: Entity | undefined): entity is Entity {
  return entity?.kind === 'object' || entity?.kind === 'equipment';
}
export function isKey(story: Story, entity: Entity | undefined): boolean {
  return (
    entity?.kind === 'object' &&
    (entity.key === true || story.entities.some((e) => e.kind === 'equipment' && e.keyItems?.includes(entity.id)) || (story.copies ?? []).some((c) => c.keyItems?.includes(entity.id)))
  );
}
export function equipmentSlots(entity: Entity | undefined): string[] {
  return entity?.kind === 'equipment' ? (entity.requiredSlots ?? []) : [];
}
