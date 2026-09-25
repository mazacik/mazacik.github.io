import { assertUnlocked, bindUnlockMethod, copyDefinition, equippedCopy, lockEffects, methodShapeErrors, unlockMethods, unlockRandomKey } from './story-locks';
import {
  isItem,
  resolveEquipment,
  variableScope,
  variableType,
  variableDefault,
  parseVariableKey,
  equipmentSlots,
  allProperties,
  mutableProperties,
  referenceEntities,
  Choice,
  Condition,
  copy,
  Effect,
  GameState,
  Playthrough,
  Step,
  Story,
  TextPart,
  uid,
} from '../models/story.model';
import { changeQuantity, inventoryIssues, quantity, takeOff, itemTargets } from './story-inventory';
import { hasFlag } from './story-flags';
import { assertLayerAccess, layerErrors } from './story-layers';

export function readVariable(story: Story, state: GameState, key: string) {
  const ref = parseVariableKey(key);
  if (!ref) return state.values[key] ?? allProperties(story).find((p) => p.property.id === key)?.property.initial;
  if (ref.scope === 'copy') return state.copyStates?.[ref.owner]?.values[ref.variable];
  const definition = story.flags?.find((v) => v.id === ref.variable);
  if (!definition || variableScope(definition) !== ref.scope || (ref.scope === 'character' && !story.entities.some((e) => e.id === ref.owner && e.kind === 'character')))
    throw new Error('Variable reference is missing.');
  if (variableType(definition) === 'boolean') return hasFlag(story, state, ref.owner, ref.variable);
  return ref.scope === 'story' ? (state.storyValues?.[ref.variable] ?? variableDefault(definition)) : (state.characterValues?.[ref.owner]?.[ref.variable] ?? variableDefault(definition));
}
export function writeVariable(story: Story, state: GameState, key: string, value: import('../models/story.model').Value) {
  const property = mutableProperties(story).find((p) => p.property.id === key)?.property;
  if (!property || typeof value !== (property.type === 'text' ? 'string' : property.type) || (typeof value === 'number' && !Number.isFinite(value)))
    throw new Error('Variable is missing, read-only, or has the wrong value type.');
  const ref = parseVariableKey(key);
  if (!ref) state.values[key] = value;
  else if (ref.scope === 'copy') {
    if (!state.copyStates?.[ref.owner]) throw new Error('Equipment copy is missing.');
    state.copyStates[ref.owner].values[ref.variable] = value;
  } else if (ref.scope === 'story') (state.storyValues ??= {})[ref.variable] = value;
  else ((state.characterValues ??= {})[ref.owner] ??= {})[ref.variable] = value;
}
export function initialState(story: Story): GameState {
  const issues = inventoryIssues(story);
  if (issues.length) throw new Error(issues.map((i) => i.message).join('\n'));
  const state: GameState = { values: {}, equipment: {}, known: [], chosen: [], directFlags: {}, quantities: {}, storyValues: {}, characterValues: {}, copyStates: {} };
  for (const { property } of allProperties(story)) {
    if (!parseVariableKey(property.id)) state.values[property.id] = property.initial;
    if (property.known) state.known.push(property.id);
  }
  for (const v of story.flags ?? []) if (variableScope(v) === 'story') state.storyValues[v.id] = variableDefault(v);
  for (const e of story.entities) {
    if (e.equipmentRole === 'type') continue;
    if (e.known || e.id === story.player) state.known.push(e.id);
    if (e.kind !== 'character') continue;
    state.equipment[e.id] = {};
    state.characterValues[e.id] = {};
    for (const v of story.flags ?? [])
      if (variableScope(v) === 'character') state.characterValues[e.id][v.id] = e.variableValues?.[v.id] ?? (e.initialFlags?.includes(v.id) ? true : variableDefault(v));
    for (const row of e.inventory ?? []) changeQuantity(state, e.id, row.target, row.quantity);
  }
  for (const c of story.copies ?? []) {
    const definition = resolveEquipment(story, c.definition);
    state.copyStates[c.id] = { owner: c.owner, values: Object.fromEntries(definition.properties.map((p) => [p.id, c.values[p.id] ?? p.initial])) };
    if (c.locked) state.copyStates[c.id].locked = true;
    if (definition.known) state.known.push(c.id);
  }
  for (const c of story.copies ?? [])
    if (c.equipped) {
      for (const layer of resolveEquipment(story, c.definition).requiredSlots) state.equipment[c.owner][layer] = c.id;
    }
  return state;
}

export function check(c: Condition, state: GameState, story: Story): boolean {
  switch (c.kind) {
    case 'locked':
      return !!state.copyStates?.[c.target]?.locked;
    case 'broken':
      return state.copyStates?.[c.target]?.condition === 'broken';
    case 'destroyed':
      return state.copyStates?.[c.target]?.condition === 'destroyed';
    case 'always':
      return true;
    case 'all':
      return c.children.every((child) => check(child, state, story));
    case 'any':
      return c.children.some((child) => check(child, state, story));
    case 'not':
      return c.children.length === 1 && !check(c.children[0], state, story);
    case 'flag':
      return hasFlag(story, state, story.flags?.find((v) => v.id === c.target)?.scope === 'story' ? '' : c.actor, c.target);
    case 'owns':
      return itemTargets(story).some((e) => e.id === c.target) && (quantity(state, c.actor, c.target) > 0 || state.copyStates?.[c.target]?.owner === c.actor);
    case 'quantity': {
      const n = quantity(state, c.actor, c.target);
      return c.op === 'eq'
        ? n === c.value
        : c.op === 'ne'
          ? n !== c.value
          : c.op === 'gt'
            ? n > Number(c.value)
            : c.op === 'gte'
              ? n >= Number(c.value)
              : c.op === 'lt'
                ? n < Number(c.value)
                : n <= Number(c.value);
    }
    case 'wears': {
      const entity = referenceEntities(story).find((e) => e.id === c.target);
      const required = equipmentSlots(entity);
      return required.length > 0 && required.every((slot) => story.slots.includes(slot) && state.equipment[c.actor]?.[slot] === c.target);
    }
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
  }
}

export function applyEffect(story: Story, state: GameState, effect: Effect): void {
  if (['equip', 'unequip', 'giveEquipment', 'removeEquipment', 'transferEquipment', ...lockEffects].includes(effect.kind)) {
    const errors = layerErrors(story);
    if (errors.length) throw new Error(errors.join(' '));
    if (effect.ignoreLayering !== undefined && typeof effect.ignoreLayering !== 'boolean') throw new Error('Ignore blocked access must be Boolean.');
  }
  const entity = referenceEntities(story).find((e) => e.id === effect.target);
  if (lockEffects.includes(effect.kind)) {
    const instance = state.copyStates?.[effect.target],
      definition = copyDefinition(story, effect.target);
    if (!instance || instance.condition === 'destroyed') throw new Error('This equipment copy is destroyed or missing.');
    if (!story.entities.some((e) => e.kind === 'character' && e.id === effect.actor) || instance.owner !== effect.actor) throw new Error('Choose the character who owns this copy.');
    const equipped = equippedCopy(state, effect.target);
    if (effect.kind === 'lockEquipment') {
      if (!definition.lockable || !equipped || instance.condition === 'broken') throw new Error('Only intact, equipped, lockable equipment can be locked.');
      instance.locked = true;
      return;
    }
    if (effect.kind === 'repairEquipment') {
      instance.condition = 'intact';
      return;
    }
    if (effect.kind === 'unlockEquipment' && !equipped) throw new Error('Only equipped equipment can be unlocked.');
    if (equipped && !effect.ignoreLayering) assertLayerAccess(story, state, instance.owner, effect.target);
    instance.locked = false;
    if (effect.kind !== 'unlockEquipment') {
      for (const slot of Object.keys(state.equipment[instance.owner] ?? {})) if (state.equipment[instance.owner][slot] === effect.target) takeOff(state, instance.owner, slot);
      instance.condition = effect.kind === 'breakEquipment' ? 'broken' : 'destroyed';
      if (instance.condition === 'destroyed') instance.owner = '';
    }
    return;
  }
  switch (effect.kind) {
    case 'giveQuantity':
    case 'removeQuantity':
    case 'transferQuantity': {
      if (entity?.kind !== 'object') throw new Error('Quantity actions require an Item definition.');
      const actor = (id: string) => story.entities.some((e) => e.id === id && e.kind === 'character');
      if (!actor(effect.actor) || (effect.kind === 'transferQuantity' && !actor(effect.from))) throw new Error('Choose inventory characters.');
      const n = Number(effect.value);
      if (typeof effect.value !== 'number' || !Number.isSafeInteger(n) || n < 1) throw new Error('Quantity must be a positive integer.');
      if (effect.kind === 'transferQuantity') {
        if (quantity(state, effect.from, effect.target) < n) throw new Error('Not enough carried items.');
        if (effect.from !== effect.actor && !Number.isSafeInteger(quantity(state, effect.actor, effect.target) + n)) throw new Error('Quantity exceeds the supported range.');
        changeQuantity(state, effect.from, effect.target, -n);
        changeQuantity(state, effect.actor, effect.target, n);
      } else changeQuantity(state, effect.actor, effect.target, effect.kind === 'removeQuantity' ? -n : n);
      break;
    }
    case 'giveEquipment':
    case 'removeEquipment':
    case 'transferEquipment': {
      const instance = state.copyStates?.[effect.target];
      if (!instance || instance.condition === 'destroyed' || !story.copies?.some((c) => c.id === effect.target)) throw new Error('Choose an equipment copy.');
      const character = (id: string) => story.entities.some((e) => e.kind === 'character' && e.id === id);
      if (!character(effect.actor)) throw new Error('Choose a character.');
      if (effect.kind === 'giveEquipment' && instance.owner) throw new Error('This equipment copy already has an owner.');
      if (effect.kind === 'removeEquipment' && instance.owner !== effect.actor) throw new Error('This character does not own the copy.');
      if (effect.kind === 'transferEquipment' && (!character(effect.from) || instance.owner !== effect.from)) throw new Error('The source character does not own the copy.');
      if (effect.kind === 'transferEquipment' && effect.from === effect.actor) return;
      if (equippedCopy(state, effect.target)) assertUnlocked(state, effect.target);
      if (!effect.ignoreLayering && Object.values(state.equipment[instance.owner] ?? {}).includes(effect.target)) assertLayerAccess(story, state, instance.owner, effect.target);
      for (const slot of Object.keys(state.equipment[instance.owner] ?? {})) if (state.equipment[instance.owner][slot] === effect.target) takeOff(state, instance.owner, slot);
      instance.owner = effect.kind === 'removeEquipment' ? '' : effect.actor;
      break;
    }
    case 'addFlag':
    case 'removeFlag': {
      const v = story.flags?.find((v) => v.id === effect.target);
      if (!v || variableType(v) !== 'boolean') throw new Error('Only Boolean variables can be assigned.');
      if (variableScope(v) === 'character') {
        if (!story.entities.some((e) => e.id === effect.actor && e.kind === 'character')) throw new Error('Choose a character.');
        ((state.characterValues ??= {})[effect.actor] ??= {})[v.id] = effect.kind === 'addFlag';
      } else (state.storyValues ??= {})[v.id] = effect.kind === 'addFlag';
      break;
    }
    case 'set':
    case 'add': {
      const current = readVariable(story, state, effect.target);
      if (effect.kind === 'add' && (typeof current !== 'number' || typeof effect.value !== 'number')) throw new Error('Only numeric variables can be incremented.');
      writeVariable(story, state, effect.target, effect.kind === 'add' ? Number(current) + Number(effect.value) : effect.value);
      break;
    }
    case 'reveal':
      if (!entity && !allProperties(story).some((p) => p.property.id === effect.target)) throw new Error('Missing information to reveal.');
      if (!state.known.includes(effect.target)) state.known.push(effect.target);
      break;
    case 'equip': {
      const required = equipmentSlots(entity);
      if (
        !itemTargets(story).some((item) => item.id === effect.target && item.kind === 'equipment') ||
        !required.length ||
        new Set(required).size !== required.length ||
        required.some((slot) => !story.slots.includes(slot)) ||
        !story.entities.some((actor) => actor.kind === 'character' && actor.id === effect.actor) ||
        !state.equipment[effect.actor]
      )
        throw new Error('Equipping requires equipment, a character and valid required layers.');
      const key = entity.id;
      if (state.copyStates?.[key]?.condition === 'broken' || state.copyStates?.[key]?.condition === 'destroyed') throw new Error('Broken or destroyed equipment cannot be equipped.');
      if (required.every((slot) => state.equipment[effect.actor][slot] === key)) return;
      if (state.copyStates?.[entity.id]?.owner !== effect.actor) throw new Error('The character does not own this equipment copy.');
      for (const displaced of new Set(required.map((slot) => state.equipment[effect.actor][slot]).filter(Boolean))) assertUnlocked(state, displaced);
      if (!effect.ignoreLayering) {
        assertLayerAccess(story, state, effect.actor, key);
        for (const displaced of new Set(required.map((slot) => state.equipment[effect.actor][slot]).filter(Boolean))) assertLayerAccess(story, state, effect.actor, displaced);
      }
      // Work on a copy so replacement/quantity failures never leave a partially changed loadout.
      const next = copy(state);
      for (const slot of required) takeOff(next, effect.actor, slot);
      for (const slot of required) next.equipment[effect.actor][slot] = key;
      if (entity.lockable && entity.lockOnEquip) next.copyStates[key].locked = true;
      state.copyStates = next.copyStates;
      state.equipment = next.equipment;
      state.quantities = next.quantities;
      break;
    }
    case 'unequip': {
      if (!itemTargets(story).some((item) => item.id === effect.target && item.kind === 'equipment')) throw new Error('Choose equipment.');
      const key = entity.id;
      if (!story.entities.some((e) => e.kind === 'character' && e.id === effect.actor) || !state.equipment[effect.actor] || state.copyStates?.[key]?.owner !== effect.actor)
        throw new Error('Choose the character who owns this copy.');
      assertUnlocked(state, key);
      const next = copy(state);
      for (const [actor, slots] of Object.entries(next.equipment)) {
        if (actor !== effect.actor) continue;
        if (!effect.ignoreLayering && Object.values(slots).includes(key)) assertLayerAccess(story, state, actor, key);
        for (const slot of Object.keys(slots)) if (slots[slot] === key) takeOff(next, actor, slot);
      }
      state.equipment = next.equipment;
      state.quantities = next.quantities;
      break;
    }
    default:
      throw new Error('Unsupported effect. Replace it with a quantity action.');
  }
}

// Tokens are parsed into text; authored HTML is never interpreted.
export function renderText(text: string, story: Story, state: GameState): TextPart[] {
  const parts: TextPart[] = [];
  const pattern = /\[\[(character|object|equipment|property):([^\]]+)\]\]/g;
  let position = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > position) parts.push({ text: text.slice(position, match.index) });
    const id = match[2];
    if (match[1] === 'property') {
      const parent = referenceEntities(story).find((e) => e.properties.some((p) => p.id === id));
      parts.push({ text: state.known.includes(id) && (!parent || state.known.includes(parent.id)) ? String(readVariable(story, state, id) ?? 'Unknown') : 'Unknown' });
    } else {
      const entity = referenceEntities(story).find((e) => e.id === id && e.kind === match[1]);
      parts.push(entity ? { text: entity.name, entity: id } : { text: '[Missing reference]' });
    }
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
  game.transcript.push({ scene: scene.id, passage: passage.id, speaker: story.entities.find((e) => e.id === passage.speaker)?.name ?? '', parts: renderText(passage.text, story, game.state) });
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

export function changePlayerEquipment(story: Story, original: Playthrough, target: string, equipped: boolean | 'lock'): Playthrough {
  if (original.status !== 'active' || original.revision !== story.revision) throw new Error('This playthrough is no longer active. Start a new game.');
  const game = copy(original);
  if (equipped === 'lock') assertLayerAccess(story, game.state, story.player, target);
  applyEffect(story, game.state, { kind: equipped === 'lock' ? 'lockEquipment' : equipped ? 'equip' : 'unequip', target, actor: story.player, value: '' });
  const name = story.copies?.find((c) => c.id === target)?.name ?? target;
  game.transcript.push({
    kind: 'equipmentAction',
    scene: game.scene,
    passage: game.passage,
    speaker: 'You',
    parts: [{ text: (equipped === 'lock' ? 'Locked ' : equipped ? 'Equipped ' : 'Unequipped ') + name + '.' }],
  });
  game.trace.push((equipped === 'lock' ? 'Lock: ' : equipped ? 'Equip: ' : 'Unequip: ') + name);
  return game;
}

export function choiceAvailable(story: Story, state: GameState, choice: Choice): boolean {
  return !!choice && (choice.repeatable === true || !state.chosen.includes(choice.id)) && check(choice.available, state, story);
}

export function choose(story: Story, original: Playthrough, choiceId: string, random: (step: string) => number = () => Math.random(), forceUnlock?: ForceUnlock): Playthrough {
  if (original.status !== 'active' || original.revision !== story.revision) throw new Error('This playthrough is no longer active. Start a new game.');
  const choice: Choice = story.scenes
    .find((s) => s.id === original.scene)
    ?.passages.find((p) => p.id === original.passage)
    ?.choices.find((c) => c.id === choiceId);
  if (!choiceAvailable(story, original.state, choice)) throw new Error('That choice is unavailable.');
  const game = copy(original);
  game.state.chosen.push(choice.id);
  const entry = [...game.transcript].reverse().find((entry) => !entry.kind || entry.kind === 'passage');
  if (entry) entry.choice = choice.label;
  game.trace.push('Choice: ' + choice.label);
  if (!executeSteps(story, game, choice.steps, random, forceUnlock)) throw new Error('This choice has no continuation or ending.');
  return game;
}

function executeSteps(story: Story, game: Playthrough, steps: Step[], random: (step: string) => number, forceUnlock?: ForceUnlock, allowUnlock = true): boolean {
  const execute = (steps: Step[]): boolean => {
    for (const step of steps) {
      switch (step.kind) {
        case 'unlock':
          if (!allowUnlock) throw new Error('Unlock methods cannot invoke other unlock attempts.');
          if (executeUnlock(story, game, step.target, step.method, step.actor, random, forceUnlock)) return true;
          break;
        case 'effect':
          applyEffect(story, game.state, step.effect);
          game.trace.push(
            'Effect: ' +
              step.effect.kind +
              ' ' +
              (story.flags?.find((f) => f.id === step.effect.target)?.name ??
                referenceEntities(story).find((e) => e.id === step.effect.target)?.name ??
                allProperties(story).find((p) => p.property.id === step.effect.target)?.label ??
                step.effect.target),
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
      }
    }
    return false;
  };
  return execute(steps);
}

export type ForceUnlock = (target: string, method: string) => boolean | undefined;
export function unlockAttemptReason(story: Story, state: GameState, target: string, methodId: string, actor: string): string {
  try {
    const instance = state.copyStates?.[target];
    if (!instance?.locked || !equippedCopy(state, target) || instance.condition === 'broken' || instance.condition === 'destroyed') throw new Error('This equipment is not locked and equipped.');
    if (!story.entities.some((e) => e.kind === 'character' && e.id === actor)) throw new Error('Choose an acting character.');
    const method = unlockMethods(story, target).find((m) => m.id === methodId);
    if (!method) throw new Error('Unlock method is missing.');
    const errors = methodShapeErrors(method);
    if (errors.length) throw new Error(errors.join(' '));
    if (method.requiresAccess) assertLayerAccess(story, state, instance.owner, target);
    if (method.requiresKey) {
      const keys = story.copies.find((c) => c.id === target).keyItems ?? copyDefinition(story, target).keyItems;
      if (!keys.some((id) => story.entities.some((e) => e.id === id && e.kind === 'object') && quantity(state, actor, id) > 0)) throw new Error('Requires a matching key.');
    }
    if (!check(bindUnlockMethod(method, actor, instance.owner, target).available, state, story)) throw new Error(method.explanation || 'Requirements are not met.');
    return '';
  } catch (e) {
    return (e as Error).message;
  }
}
function executeUnlock(story: Story, game: Playthrough, target: string, methodId: string, actor: string, random: (step: string) => number, forceUnlock?: ForceUnlock): boolean {
  const reason = unlockAttemptReason(story, game.state, target, methodId, actor);
  if (reason) throw new Error(reason);
  const wearer = game.state.copyStates[target].owner;
  const method = bindUnlockMethod(
    unlockMethods(story, target).find((m) => m.id === methodId),
    actor,
    wearer,
    target,
  );
  const passes = check(method.success, game.state, story);
  const methodRandom = (step: string) => random(unlockRandomKey(target, methodId, step));
  executeSteps(story, game, method.costs, methodRandom, undefined, false);
  const forced = forceUnlock?.(target, methodId);
  const draw = forced === undefined && passes && method.chance > 0 && method.chance < 100 ? methodRandom('chance') : 0;
  if (!(draw >= 0 && draw < 1)) throw new Error('Invalid random draw.');
  const succeeded = forced ?? (passes && method.chance > 0 && draw * 100 < method.chance);
  if (succeeded) {
    const kind = method.result === 'break' ? 'breakEquipment' : method.result === 'destroy' ? 'destroyEquipment' : 'unlockEquipment';
    applyEffect(story, game.state, { kind, target, actor: wearer, value: '', ignoreLayering: !method.requiresAccess });
    if (method.result === 'unequip') applyEffect(story, game.state, { kind: 'unequip', target, actor: wearer, value: '', ignoreLayering: !method.requiresAccess });
  }
  const copyName = story.copies.find((c) => c.id === target).name;
  const actorName = story.entities.find((e) => e.id === actor).name;
  game.transcript.push({
    kind: 'equipmentAttempt',
    scene: game.scene,
    passage: game.passage,
    speaker: actor === story.player ? 'You' : actorName,
    action: method.label + ': ' + copyName,
    parts: [{ text: (succeeded ? method.successMessage : method.failureMessage) || (succeeded ? 'Succeeded.' : 'The attempt failed.') }],
    attempt: { target, actor, method: methodId, succeeded },
  });
  game.trace.push('Unlock attempt: ' + method.label + ' - ' + copyName + ': ' + (succeeded ? 'succeeded' : 'failed') + ' (draw ' + draw + ')');
  return executeSteps(story, game, succeeded ? method.yes : method.no, methodRandom, undefined, false);
}
export function attemptPlayerUnlock(
  story: Story,
  original: Playthrough,
  target: string,
  method: string,
  random: (step: string) => number = () => Math.random(),
  forceUnlock?: ForceUnlock,
): Playthrough {
  if (original.status !== 'active' || original.revision !== story.revision) throw new Error('This playthrough is no longer active. Start a new game.');
  if (original.state.copyStates?.[target]?.owner !== story.player) throw new Error('The player does not own this equipment.');
  const game = copy(original);
  executeUnlock(story, game, target, method, story.player, random, forceUnlock);
  return game;
}
