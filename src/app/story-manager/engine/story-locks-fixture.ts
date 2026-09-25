import { newFlag, newUnlockMethod, always, variableKey } from '../models/story.model';
import { layersFixture } from './story-layers-fixture';

export function locksFixture() {
  const story = layersFixture();
  story.layerCoverage = {};
  const cuffs = story.entities.find((e) => e.id === 'dagger');
  cuffs.name = 'Handcuffs';
  cuffs.lockable = true;
  cuffs.keyItems = ['apple'];
  cuffs.unlockMethods = [{ ...newUnlockMethod(), id: 'key-method', label: 'Use key', requiresKey: true }];
  story.copies[0].name = 'Guard handcuffs';
  story.copies[0].locked = true;
  story.entities.find((e) => e.id === 'apple').name = 'Guard key';
  story.flags.push({ ...newFlag(), id: 'magic', name: 'Magic', scope: 'character', type: 'number', initial: 20 }, { ...newFlag(), id: 'alert', name: 'Guard alerted', scope: 'story' });
  return story;
}
export function dispelMethod() {
  return {
    ...newUnlockMethod(),
    id: 'dispel',
    label: 'Dispel curse',
    success: { ...always(), kind: 'property' as const, target: variableKey('character', '@actor', 'magic'), op: 'gte' as const, value: 20 },
    costs: [{ id: 'spend-magic', kind: 'effect' as const, effect: { kind: 'add' as const, actor: '', target: variableKey('character', '@actor', 'magic'), value: -20 } }],
    no: [{ id: 'noise', kind: 'effect' as const, effect: { kind: 'addFlag' as const, actor: '', target: 'alert', value: '' } }],
    failureMessage: 'The curse resists. A guard hears the noise.',
  };
}
