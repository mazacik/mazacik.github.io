import { copy, newFlag } from '../models/story.model';
import { storyFixture } from './story-fixture';

export function flagsFixture() {
  const story = storyFixture();
  story.flags = ['top', 'bottom', 'armed', 'cursed'].map((id) => ({ ...newFlag(), scope: 'character', id, name: id }));
  story.flags.push(...['clothed', 'naked'].map((id) => ({ ...newFlag(), scope: 'character' as const, id, name: id === 'clothed' ? 'Fully clothed' : 'Naked' })));
  const coat = story.entities.find((e) => e.id === 'coat');
  coat.name = 'Shirt';
  coat.flagGrants = [{ flag: 'top', when: 'equipped' }];
  const pants = { ...copy(coat), id: 'pants', name: 'Pants', requiredSlots: ['Legs'], flagGrants: [{ flag: 'bottom', when: 'equipped' as const }] };
  story.entities.push(pants);
  story.copies.push({ id: 'pants-copy', definition: 'pants', name: 'Pants', owner: 'player', equipped: false, values: {} });
  const weapon = story.entities.find((e) => e.id === 'key');
  weapon.name = 'Sword';
  story.scenes.forEach((scene) => scene.passages.forEach((passage) => (passage.text = passage.text.replaceAll('[[object:key]]', '[[equipment:key]]'))));
  story.entities[0].inventory = [];
  story.copies.push({ id: 'key-copy', definition: 'key', name: 'Sword', owner: 'player', equipped: true, values: {} });
  weapon.kind = 'equipment';
  weapon.requiredSlots = ['Head'];
  weapon.flagGrants = [{ flag: 'armed', when: 'owned' }];
  story.entities.find((e) => e.id === 'Mira').initialFlags = ['cursed'];
  const choice = story.scenes[2].passages[0].choices[0];
  choice.available.target = 'key-copy';
  if (choice.steps[0].kind === 'effect') choice.steps[0].effect = { kind: 'transferEquipment', target: 'key-copy', from: 'player', actor: 'Mira', value: '' };
  return story;
}
