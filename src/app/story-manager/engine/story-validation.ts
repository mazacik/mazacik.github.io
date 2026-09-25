import { lockEffects, methodShapeErrors, unlockContextStory, unlockMethods } from './story-locks';
import { inventoryIssues, itemTargets } from './story-inventory';
import {
  isItem,
  equipmentSlots,
  allProperties,
  mutableProperties,
  referenceEntities,
  Condition,
  Issue,
  EntityDetailSection,
  Step,
  Story,
  walkSteps,
  resolveEquipment,
  variableType,
  variableScope,
  parseVariableKey,
} from '../models/story.model';
import { validateFlags } from './story-flags';

export function validateStory(story: Story): Issue[] {
  const issues: Issue[] = [...validateFlags(story), ...inventoryIssues(story)];
  let properties = allProperties(story).map((p) => p.property);
  const choices = story.scenes.flatMap((s) => s.passages.flatMap((p) => p.choices));
  const entity = (id: string, kind?: string) => referenceEntities(story).some((e) => e.id === id && (!kind || e.kind === kind));
  let scene: string, passage: string, methodOwner: string, methodLabel: string;
  const error = (message: string) => issues.push(methodOwner ? { message: methodLabel + ': ' + message, entity: methodOwner, section: 'Locks' } : { message, scene, passage });
  const condition = (c: Condition) => {
    if (['locked', 'broken', 'destroyed'].includes(c.kind) && !story.copies?.some((copy) => copy.id === c.target)) error('Equipment state checks need an existing copy.');
    if (['all', 'any', 'not'].includes(c.kind)) {
      if (!c.children.length || (c.kind === 'not' && c.children.length !== 1)) error('Condition group needs ' + (c.kind === 'not' ? 'exactly one check.' : 'at least one check.'));
      c.children.forEach(condition);
    }
    if (
      c.kind === 'quantity' &&
      (!story.entities.some((e) => e.kind === 'object' && e.id === c.target) || !entity(c.actor, 'character') || typeof c.value !== 'number' || !Number.isSafeInteger(c.value) || c.value < 0)
    )
      error('Quantity checks need an item, character and nonnegative integer.');
    if (c.kind === 'property') {
      const p = properties.find((p) => p.id === c.target);
      if (!p) error('Condition refers to a missing variable.');
      else if (typeof c.value !== (p.type === 'text' ? 'string' : p.type) || (!['eq', 'ne'].includes(c.op) && p.type !== 'number') || (typeof c.value === 'number' && !Number.isFinite(c.value)))
        error('Condition value/operator does not match the variable type.');
    }
    if (['owns', 'wears'].includes(c.kind) && (!itemTargets(story).some((e) => e.id === c.target && (c.kind !== 'wears' || e.kind === 'equipment')) || !entity(c.actor, 'character')))
      error('Condition needs a valid item and character; equipped checks require Equipment.');
    if (c.kind === 'known' && !entity(c.target) && !properties.some((p) => p.id === c.target)) error('Knowledge condition has a missing reference.');
    if (c.kind === 'chosen' && !choices.some((choice) => choice.id === c.target)) error('Condition refers to a missing choice.');
    if (c.kind === 'flag') {
      const v = story.flags?.find((v) => v.id === c.target);
      if (!v || variableType(v) !== 'boolean' || (variableScope(v) === 'character' && !entity(c.actor, 'character'))) error('Boolean check needs a valid variable and character when applicable.');
    }
  };
  const sequence = (steps: Step[]): boolean => {
    let terminal = false;
    for (const step of steps) {
      if (terminal) error('Remove steps after a continuation or ending.');
      switch (step.kind) {
        case 'unlock': {
          const method = unlockMethods(story, step.target).find((m) => m.id === step.method);
          if (methodOwner) error('Unlock methods cannot invoke other unlock attempts.');
          if (!method || !entity(step.actor, 'character')) error('Unlock attempt needs an existing method, equipment copy, and acting character.');
          const ends = (steps: Step[]): boolean =>
            steps.some(
              (s) =>
                s.kind === 'go' ||
                s.kind === 'end' ||
                (s.kind === 'condition' && ends(s.yes) && ends(s.no)) ||
                (s.kind === 'random' && s.branches.length > 0 && s.branches.every((b) => ends(b.steps))),
            );
          terminal = !!method && ends(method.yes) && ends(method.no);
          break;
        }
        case 'end':
          terminal = true;
          break;
        case 'go': {
          const destination = story.scenes.find((s) => s.id === step.scene);
          if (!destination || !destination.passages.some((p) => p.id === (step.passage || destination.entry))) error('Continuation refers to a missing scene or passage.');
          terminal = true;
          break;
        }
        case 'condition': {
          condition(step.condition);
          const yes = sequence(step.yes),
            no = sequence(step.no);
          terminal = yes && no;
          break;
        }
        case 'random': {
          if (!step.branches.length || step.branches.some((b) => !Number.isFinite(b.percent) || b.percent <= 0) || Math.abs(step.branches.reduce((sum, b) => sum + b.percent, 0) - 100) > 0.000001)
            error('Chance outcomes need positive percentages totaling 100%.');
          const ends = step.branches.map((b) => sequence(b.steps));
          terminal = ends.length > 0 && ends.every(Boolean);
          break;
        }
        case 'effect': {
          const e = step.effect;
          if (e.ignoreLayering !== undefined && typeof e.ignoreLayering !== 'boolean') error('Ignore blocked access must be Boolean.');
          if (['set', 'add'].includes(e.kind)) {
            const p = mutableProperties(story).find((p) => p.property.id === e.target)?.property;
            if (!p) error('Effect refers to a missing variable.');
            else if (typeof e.value !== (p.type === 'text' ? 'string' : p.type) || (e.kind === 'add' && p.type !== 'number') || (typeof e.value === 'number' && !Number.isFinite(e.value)))
              error('Effect value does not match the variable type.');
          } else if (['giveQuantity', 'removeQuantity', 'transferQuantity'].includes(e.kind)) {
            if (
              !story.entities.some((d) => d.id === e.target && d.kind === 'object') ||
              !entity(e.actor, 'character') ||
              typeof e.value !== 'number' ||
              !Number.isSafeInteger(e.value) ||
              e.value < 1 ||
              (e.kind === 'transferQuantity' && !entity(e.from, 'character'))
            )
              error('Quantity effects need a item definition, valid characters and a positive integer.');
          } else if (e.kind === 'addFlag' || e.kind === 'removeFlag') {
            const v = story.flags?.find((v) => v.id === e.target);
            if (v && (variableType(v) !== 'boolean' || (variableScope(v) === 'character' && !entity(e.actor, 'character')))) error('Boolean effect needs a matching variable and character.');
            if (!v) error('Direct flag effects need an existing stored Boolean variable.');
          } else if (['giveEquipment', 'removeEquipment', 'transferEquipment', ...lockEffects].includes(e.kind)) {
            if (!story.copies?.some((c) => c.id === e.target) || !entity(e.actor, 'character') || (e.kind === 'transferEquipment' && !entity(e.from, 'character')))
              error('Equipment actions need a copy and valid characters.');
          } else if (e.kind === 'reveal') {
            if (!entity(e.target) && !properties.some((p) => p.id === e.target)) error('Reveal effect refers to missing information.');
          } else {
            if (!['equip', 'unequip'].includes(e.kind)) error('Unsupported effect. Replace it with a quantity action.');
            if (!itemTargets(story).some((i) => i.id === e.target)) error('Effect needs an item.');
            if (!entity(e.actor, 'character')) error('Effect needs a character.');
            if (['equip', 'unequip'].includes(e.kind) && !entity(e.target, 'equipment')) error('Equip and unequip effects require Equipment.');
          }
          break;
        }
      }
    }
    return terminal;
  };
  if (!entity(story.player, 'character')) error('Choose a player character.');
  if (!story.scenes.some((s) => s.id === story.start)) error('Choose a starting scene.');
  for (const p of properties)
    if (!p.name.trim() || typeof p.initial !== (p.type === 'text' ? 'string' : p.type) || (typeof p.initial === 'number' && !Number.isFinite(p.initial))) {
      const raw = story.entities.find((e) => e.properties.some((value) => value.id === p.id));
      if (raw) issues.push({ entity: raw.id, section: 'Variables', message: 'Variable needs a name and a starting value of its selected type.' });
      else error('Property needs a name and a starting value of its selected type.');
    }
  for (const raw of story.entities) {
    if (!raw.name.trim()) error('Characters, items and equipment need names.');
    if (raw.kind !== 'equipment') continue;
    const fail = (message: string, section: EntityDetailSection = 'General') => issues.push({ entity: raw.id, section, message: raw.name + ': ' + message });
    try {
      const e = resolveEquipment(story, raw.id),
        required = equipmentSlots(e);
      if (typeof e.lockable !== 'boolean' || typeof e.lockOnEquip !== 'boolean') fail('Lock settings must use Boolean values.', 'Locks');
      if (!required.length || new Set(required).size !== required.length || required.some((slot) => !story.slots.includes(slot))) fail('Choose distinct, existing required equipment layers.');
      for (const p of e.properties)
        if (
          !p.id ||
          e.properties.filter((other) => other.id === p.id).length !== 1 ||
          !p.name.trim() ||
          typeof p.initial !== (p.type === 'text' ? 'string' : p.type) ||
          (typeof p.initial === 'number' && !Number.isFinite(p.initial))
        )
          fail('Invalid equipment variable default.', 'Variables');
      if ((e.keyItems ?? []).some((id) => !story.entities.some((item) => item.id === id && item.kind === 'object'))) fail('Compatible keys must be existing Items.', 'Locks');
      const source = story,
        originalProperties = properties;
      try {
        story = unlockContextStory(source, raw.id);
        properties = allProperties(story).map((p) => p.property);
        methodOwner = raw.id;
        for (const method of e.unlockMethods ?? []) {
          methodLabel = method.label;
          methodShapeErrors(method).forEach(error);
          if (e.unlockMethods.filter((m) => m.id === method.id).length !== 1) error('Unlock method IDs must be unique within the equipment definition.');
          condition(method.available);
          condition(method.success);
          sequence(method.costs);
          sequence(method.yes);
          sequence(method.no);
        }
      } finally {
        story = source;
        properties = originalProperties;
        methodOwner = undefined;
      }
    } catch (e) {
      fail((e as Error).message);
    }
  }
  for (const s of story.scenes) {
    scene = s.id;
    passage = undefined;
    if (!s.passages.some((p) => p.id === s.entry)) error('Choose an entry passage.');
    for (const p of s.passages) {
      passage = p.id;
      if (p.speaker && !entity(p.speaker, 'character')) error('Dialogue speaker is missing.');
      for (const match of p.text.matchAll(/\[\[(character|object|equipment|property):([^\]]+)\]\]/g)) {
        if (match[1] === 'property' ? !properties.some((p) => p.id === match[2]) : !entity(match[2], match[1])) error('Text contains a missing reference.');
      }
      if (!p.choices.length) error('Add a Continue choice, dialogue options, or a choice that ends the story.');
      for (const c of p.choices) {
        if (!c.label.trim()) error('Choice needs a label.');
        if (c.repeatable !== undefined && typeof c.repeatable !== 'boolean') error('Choice repeatable setting must be a Boolean.');
        condition(c.available);
        if (!sequence(c.steps)) error('“' + c.label + '” has a path without a continuation or ending.');
      }
    }
  }
  return issues;
}

export function incomingReferences(story: Story, id: string): string[] {
  const refs: string[] = [];
  for (const c of story.copies ?? []) {
    if (c.definition === id || c.owner === id || c.keyItems?.includes(id) || Object.keys(c.values).includes(id)) refs.push('Equipment copy: ' + c.name);
  }
  for (const e of story.entities) {
    if (e.keyItems?.includes(id)) refs.push('Compatible key for ' + e.name);
    if (
      (e.unlockMethods ?? []).some(
        (m) =>
          JSON.stringify(m).includes(JSON.stringify(id)) ||
          [...JSON.stringify(m).matchAll(/v\/[^"\s]+/g)].some((match) => parseVariableKey(match[0])?.variable === id || parseVariableKey(match[0])?.owner === id),
      )
    )
      refs.push('Unlock methods of ' + e.name);
    if (e.parentId === id) refs.push('Equipment: ' + e.name);
    if (Object.keys(e.propertyOverrides ?? {}).includes(id) || Object.keys(e.variableValues ?? {}).includes(id)) refs.push('Variable override: ' + e.name);
  }
  if (story.player === id) refs.push('Player character');
  if (story.start === id) refs.push('Starting scene');
  story.scenes.filter((s) => s.entry === id).forEach((s) => refs.push('Entry passage of ' + s.title));
  for (const entity of story.entities) {
    if (entity.inventory?.some((r) => r.target === id)) refs.push('Starting inventory of ' + entity.name);
    if (entity.initialFlags?.includes(id)) refs.push('Starting Boolean values of ' + entity.name);
    if (entity.flagGrants?.some((g) => g.flag === id)) refs.push('Variable grants from ' + entity.name);
  }
  for (const scene of story.scenes)
    for (const passage of scene.passages) {
      if (
        passage.speaker === id ||
        passage.text.includes(':' + id + ']]') ||
        [...passage.text.matchAll(/\[\[property:([^\]]+)\]\]/g)].some((m) => {
          const ref = parseVariableKey(m[1]);
          return ref?.owner === id || ref?.variable === id;
        })
      )
        refs.push(scene.title + ' / ' + passage.title);
      for (const choice of passage.choices) {
        const data = JSON.stringify({ available: choice.available, steps: choice.steps });
        if (
          data.includes('"' + id + '"') ||
          [...data.matchAll(/v\/[^"\s]+/g)].some((match) => {
            const ref = parseVariableKey(match[0]);
            return ref?.owner === id || ref?.variable === id;
          })
        )
          refs.push(scene.title + ' / ' + passage.title + ' / ' + choice.label);
      }
    }
  return [...new Set(refs)];
}

export function sceneEdges(story: Story): { from: string; to: string; choice: string; passage: string; label: string; id: string }[] {
  return story.scenes.flatMap((scene) =>
    scene.passages.flatMap((p) =>
      p.choices.flatMap((c) =>
        walkSteps(c.steps)
          .filter((step): step is Extract<Step, { kind: 'go' }> => step.kind === 'go')
          .map((step) => ({
            from: scene.id,
            to: step.scene,
            choice: c.id,
            passage: p.id,
            label: c.label + (walkSteps(c.steps).some((s) => s.kind === 'condition' || s.kind === 'random') ? ' ◇' : ''),
            id: step.id,
          })),
      ),
    ),
  );
}
