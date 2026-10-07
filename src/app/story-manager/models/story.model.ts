export type Value = string | number | boolean;
export type VariableType = 'text' | 'number' | 'boolean';
export interface FlagDefinition {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  type: VariableType;
  initial: Value;
}
/** Variable presentation used by the editors and reference picker. */
export interface Property {
  id: string;
  name: string;
  type: VariableType;
  initial: Value;
  known: boolean;
}
export interface Story {
  id: string;
  revision: number;
  start: string;
  scenes: Scene[];
  flags: FlagDefinition[];
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
  kind: 'always' | 'all' | 'any' | 'not' | 'property' | 'known' | 'chosen' | 'flag';
  children: Condition[];
  target: string;
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  value: Value;
}
export interface Effect {
  kind: 'set' | 'add' | 'reveal' | 'addFlag' | 'removeFlag';
  target: string;
  value: Value;
}
export type Step =
  | { id: string; kind: 'effect'; effect: Effect }
  | { id: string; kind: 'condition'; condition: Condition; yes: Step[]; no: Step[] }
  | { id: string; kind: 'random'; branches: { id: string; percent: number; steps: Step[] }[] }
  | { id: string; kind: 'go'; scene: string; passage: string }
  | { id: string; kind: 'end' };
export interface GameState {
  storyValues: Record<string, Value>;
  known: string[];
  chosen: string[];
}
export interface TextPart {
  text: string;
}
export interface Transcript {
  scene: string;
  passage: string;
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
export interface Issue {
  message: string;
  scene?: string;
  passage?: string;
  flag?: string;
}
export const uid = (): string => crypto.randomUUID();
export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const always = (): Condition => ({ kind: 'always', children: [], target: '', op: 'eq', value: '' });
export const newPassage = (): Passage => ({ id: uid(), title: 'New passage', text: '', choices: [] });
export function newScene(): Scene {
  const p = newPassage();
  return { id: uid(), title: 'New scene', entry: p.id, passages: [p], noteIds: [] };
}
export const newChoice = (): Choice => ({ id: uid(), label: 'Continue', repeatable: false, available: always(), unavailable: 'disabled', explanation: '', steps: [] });
export const newStory = (id: string): Story => ({ id, revision: 0, start: '', scenes: [], flags: [] });
export const newFlag = (): FlagDefinition => ({ id: uid(), name: 'New variable', description: '', type: 'boolean', initial: false, visible: false });
export const variableType = (v: FlagDefinition): VariableType => v.type;
export const variableDefault = (v: FlagDefinition): Value => v.initial;
// Keep the story-variable token format used by the reference picker.
export const variableKey = (id: string): string => 'v/' + encodeURIComponent(JSON.stringify(['story', '', id]));
export function parseVariableKey(key: string): { variable: string } | undefined {
  if (!key.startsWith('v/')) return undefined;
  try {
    const value = JSON.parse(decodeURIComponent(key.slice(2)));
    if (Array.isArray(value) && value.length === 3 && value[0] === 'story' && value[1] === '' && typeof value[2] === 'string') return { variable: value[2] };
  } catch {
    /* Invalid references are reported by validation. */
  }
  return undefined;
}
export function allProperties(story: Story): { property: Property; label: string }[] {
  return story.flags.map((v) => ({
    property: { id: variableKey(v.id), name: v.name, type: v.type, initial: v.initial, known: v.visible },
    label: v.name,
  }));
}
export function walkSteps(steps: Step[]): Step[] {
  return steps.flatMap((s) => [s, ...(s.kind === 'condition' ? [...walkSteps(s.yes), ...walkSteps(s.no)] : s.kind === 'random' ? s.branches.flatMap((b) => walkSteps(b.steps)) : [])]);
}
