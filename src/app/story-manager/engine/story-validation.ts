import { allProperties, Condition, Issue, Step, Story, walkSteps, parseVariableKey } from '../models/story.model';
import { validateFlags } from './story-flags';
export function validateStory(story: Story): Issue[] {
  const issues = [...validateFlags(story)];
  const properties = allProperties(story).map((p) => p.property);
  const choices = story.scenes.flatMap((s) => s.passages.flatMap((p) => p.choices));
  let scene: string, passage: string;
  const error = (message: string) => issues.push({ message, scene, passage });
  const condition = (c: Condition) => {
    if (!['always', 'all', 'any', 'not', 'property', 'known', 'chosen', 'flag'].includes(c.kind)) error('Unsupported condition.');
    if (['all', 'any', 'not'].includes(c.kind)) {
      if (!c.children.length || (c.kind === 'not' && c.children.length !== 1)) error('Condition group needs ' + (c.kind === 'not' ? 'exactly one check.' : 'at least one check.'));
      c.children.forEach(condition);
    }
    if (c.kind === 'property') {
      const p = properties.find((p) => p.id === c.target);
      if (!p) error('Condition refers to a missing variable.');
      else if (
        !['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].includes(c.op) ||
        typeof c.value !== (p.type === 'text' ? 'string' : p.type) ||
        (!['eq', 'ne'].includes(c.op) && p.type !== 'number') ||
        (typeof c.value === 'number' && !Number.isFinite(c.value))
      )
        error('Condition value/operator does not match the variable type.');
    }
    if (c.kind === 'known' && !properties.some((p) => p.id === c.target)) error('Knowledge condition refers to a missing variable.');
    if (c.kind === 'chosen' && !choices.some((choice) => choice.id === c.target)) error('Condition refers to a missing choice.');
    if (c.kind === 'flag' && !story.flags.some((v) => v.id === c.target && v.type === 'boolean')) error('Boolean check needs an existing Boolean variable.');
  };
  const sequence = (steps: Step[]): boolean => {
    let terminal = false;
    for (const step of steps) {
      if (terminal) error('Remove steps after a continuation or ending.');
      switch (step.kind) {
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
          if (['set', 'add'].includes(e.kind)) {
            const p = allProperties(story).find((p) => p.property.id === e.target)?.property;
            if (!p) error('Effect refers to a missing variable.');
            else if (typeof e.value !== (p.type === 'text' ? 'string' : p.type) || (e.kind === 'add' && p.type !== 'number') || (typeof e.value === 'number' && !Number.isFinite(e.value)))
              error('Effect value does not match the variable type.');
          } else if (e.kind === 'addFlag' || e.kind === 'removeFlag') {
            if (!story.flags.some((v) => v.id === e.target && v.type === 'boolean')) error('Boolean effect needs an existing Boolean variable.');
          } else if (e.kind === 'reveal') {
            if (!properties.some((p) => p.id === e.target)) error('Reveal effect refers to a missing variable.');
          } else error('Unsupported effect.');
          break;
        }
        default:
          error('Unsupported story step.');
      }
    }
    return terminal;
  };
  if (!story.scenes.some((s) => s.id === story.start)) error('Choose a starting scene.');
  for (const s of story.scenes) {
    scene = s.id;
    passage = undefined;
    if (!s.passages.some((p) => p.id === s.entry)) error('Choose an entry passage.');
    for (const p of s.passages) {
      passage = p.id;
      for (const match of p.text.matchAll(/\[\[property:([^\]]+)\]\]/g)) {
        if (!properties.some((p) => p.id === match[1])) error('Text contains a missing variable reference.');
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
  if (story.start === id) refs.push('Starting scene');
  story.scenes.filter((s) => s.entry === id).forEach((s) => refs.push('Entry passage of ' + s.title));
  for (const scene of story.scenes)
    for (const passage of scene.passages) {
      if (
        passage.text.includes(':' + id + ']]') ||
        [...passage.text.matchAll(/\[\[property:([^\]]+)\]\]/g)].some((m) => {
          const ref = parseVariableKey(m[1]);
          return ref?.variable === id;
        })
      )
        refs.push(scene.title + ' / ' + passage.title);
      for (const choice of passage.choices) {
        const data = JSON.stringify({ available: choice.available, steps: choice.steps });
        if (
          data.includes('"' + id + '"') ||
          [...data.matchAll(/v\/[^"\s]+/g)].some((match) => {
            const ref = parseVariableKey(match[0]);
            return ref?.variable === id;
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
