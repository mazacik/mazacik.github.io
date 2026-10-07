import { allProperties, parseVariableKey, variableKey, Choice, Condition, copy, Effect, GameState, Playthrough, Step, Story, TextPart, uid, Value } from '../models/story.model';
import { hasFlag, validateFlags } from './story-flags';
export function readVariable(story: Story, state: GameState, key: string): Value {
  const ref = parseVariableKey(key);
  const variable = ref && story.flags.find((v) => v.id === ref.variable);
  if (!variable) throw new Error('Variable reference is missing.');
  return state.storyValues[variable.id] ?? variable.initial;
}
export function writeVariable(story: Story, state: GameState, key: string, value: Value): void {
  const ref = parseVariableKey(key);
  const variable = ref && story.flags.find((v) => v.id === ref.variable);
  if (!variable || typeof value !== (variable.type === 'text' ? 'string' : variable.type) || (typeof value === 'number' && !Number.isFinite(value)))
    throw new Error('Variable is missing or has the wrong value type.');
  state.storyValues[variable.id] = value;
}
export function initialState(story: Story): GameState {
  const issues = validateFlags(story);
  if (issues.length) throw new Error(issues.map((i) => i.message).join('\n'));
  return {
    storyValues: Object.fromEntries(story.flags.map((v) => [v.id, v.initial])),
    known: story.flags.filter((v) => v.visible).map((v) => variableKey(v.id)),
    chosen: [],
  };
}
export function check(c: Condition, state: GameState, story: Story): boolean {
  switch (c.kind) {
    case 'always':
      return true;
    case 'all':
      return c.children.every((child) => check(child, state, story));
    case 'any':
      return c.children.some((child) => check(child, state, story));
    case 'not':
      return c.children.length === 1 && !check(c.children[0], state, story);
    case 'flag':
      return hasFlag(story, state, c.target);
    case 'known':
      return state.known.includes(c.target);
    case 'chosen':
      return state.chosen.includes(c.target);
    case 'property': {
      const value = readVariable(story, state, c.target);
      switch (c.op) {
        case 'eq':
          return value === c.value;
        case 'ne':
          return value !== c.value;
        case 'gt':
          return typeof value === 'number' && value > Number(c.value);
        case 'gte':
          return typeof value === 'number' && value >= Number(c.value);
        case 'lt':
          return typeof value === 'number' && value < Number(c.value);
        case 'lte':
          return typeof value === 'number' && value <= Number(c.value);
      }
    }
    default:
      throw new Error('Unsupported condition.');
  }
}

export function applyEffect(story: Story, state: GameState, effect: Effect): void {
  switch (effect.kind) {
    case 'set':
    case 'add': {
      const current = readVariable(story, state, effect.target);
      if (effect.kind === 'add' && (typeof current !== 'number' || typeof effect.value !== 'number')) throw new Error('Only numeric variables can be incremented.');
      writeVariable(story, state, effect.target, effect.kind === 'add' ? Number(current) + Number(effect.value) : effect.value);
      break;
    }
    case 'addFlag':
    case 'removeFlag':
      hasFlag(story, state, effect.target);
      writeVariable(story, state, variableKey(effect.target), effect.kind === 'addFlag');
      break;
    case 'reveal':
      readVariable(story, state, effect.target);
      if (!state.known.includes(effect.target)) state.known.push(effect.target);
      break;
    default:
      throw new Error('Unsupported effect.');
  }
}
// Tokens render as plain text; authored HTML is never interpreted.
export function renderText(text: string, story: Story, state: GameState): TextPart[] {
  const parts: TextPart[] = [];
  let position = 0;
  for (const match of text.matchAll(/\[\[property:([^\]]+)\]\]/g)) {
    if (match.index > position) parts.push({ text: text.slice(position, match.index) });
    const value = readVariable(story, state, match[1]);
    parts.push({ text: state.known.includes(match[1]) ? String(value) : 'Unknown' });
    position = match.index + match[0].length;
  }
  if (position < text.length) parts.push({ text: text.slice(position) });
  return parts;
}
function enter(story: Story, game: Playthrough, sceneId: string, passageId?: string): void {
  const scene = story.scenes.find((s) => s.id === sceneId);
  const passage = scene?.passages.find((p) => p.id === (passageId || scene.entry));
  if (!scene || !passage) throw new Error('The destination passage is missing.');
  game.scene = scene.id;
  game.passage = passage.id;
  game.transcript.push({ scene: scene.id, passage: passage.id, parts: renderText(passage.text, story, game.state) });
}
export function startGame(story: Story, name: string, sceneId = story.start, state = initialState(story)): Playthrough {
  const game: Playthrough = {
    id: uid(),
    storyId: story.id,
    revision: story.revision,
    name,
    status: 'active',
    scene: '',
    passage: '',
    state: copy(state),
    transcript: [],
    trace: [],
    created: new Date().toISOString(),
  };
  enter(story, game, sceneId);
  return game;
}
export function choiceAvailable(story: Story, state: GameState, choice: Choice): boolean {
  return !!choice && (choice.repeatable === true || !state.chosen.includes(choice.id)) && check(choice.available, state, story);
}

export function choose(story: Story, original: Playthrough, choiceId: string, random: (step: string) => number = () => Math.random()): Playthrough {
  if (original.status !== 'active' || original.revision !== story.revision) throw new Error('This playthrough is no longer active. Start a new game.');
  const choice: Choice = story.scenes
    .find((s) => s.id === original.scene)
    ?.passages.find((p) => p.id === original.passage)
    ?.choices.find((c) => c.id === choiceId);
  if (!choiceAvailable(story, original.state, choice)) throw new Error('That choice is unavailable.');
  const game = copy(original);
  game.state.chosen.push(choice.id);
  const entry = game.transcript.at(-1);
  if (entry) entry.choice = choice.label;
  game.trace.push('Choice: ' + choice.label);
  if (!executeSteps(story, game, choice.steps, random)) throw new Error('This choice has no continuation or ending.');
  return game;
}

function executeSteps(story: Story, game: Playthrough, steps: Step[], random: (step: string) => number): boolean {
  const execute = (steps: Step[]): boolean => {
    for (const step of steps) {
      switch (step.kind) {
        case 'effect':
          applyEffect(story, game.state, step.effect);
          game.trace.push(
            'Effect: ' +
              step.effect.kind +
              ' ' +
              (story.flags?.find((f) => f.id === step.effect.target)?.name ?? allProperties(story).find((p) => p.property.id === step.effect.target)?.label ?? step.effect.target),
          );
          break;
        case 'condition': {
          const result = check(step.condition, game.state, story);
          game.trace.push('Condition ' + step.id + ': ' + (result ? 'passed' : 'failed'));
          if (execute(result ? step.yes : step.no)) return true;
          break;
        }
        case 'random': {
          const sum = step.branches.reduce((n, b) => n + b.percent, 0);
          if (!step.branches.length || Math.abs(sum - 100) > 0.000001 || step.branches.some((b) => !Number.isFinite(b.percent) || b.percent <= 0))
            throw new Error('Chance percentages must total 100%.');
          const draw = random(step.id);
          if (!(draw >= 0 && draw < 1)) throw new Error('Invalid random draw.');
          let boundary = 0;
          const index = step.branches.findIndex((b) => {
            boundary += b.percent;
            return draw * 100 < boundary;
          });
          const branch = step.branches[index];
          game.trace.push('Chance ' + step.id + ': outcome ' + (index + 1) + ' (' + branch.percent + '%, draw ' + draw + ')');
          if (execute(branch.steps)) return true;
          break;
        }
        case 'go':
          enter(story, game, step.scene, step.passage);
          return true;
        case 'end':
          game.status = 'ended';
          return true;
        default:
          throw new Error('Unsupported story step.');
      }
    }
    return false;
  };
  return execute(steps);
}
