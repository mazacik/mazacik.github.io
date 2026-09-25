import { copy } from '../models/story.model';
import { inventoryFixture } from './story-inventory-fixture';

export function layersFixture() {
  const story = inventoryFixture();
  story.slots = ['Underwear', 'Shirt', 'Armour', 'Helmet'];
  story.layerCoverage = { Armour: ['Shirt'], Shirt: ['Underwear'] };
  const shirt = story.entities.find((e) => e.id === 'dagger');
  shirt.name = 'Shirt';
  shirt.requiredSlots = ['Shirt'];
  story.copies[0].name = 'Linen shirt';
  story.copies[0].equipped = true;
  for (const layer of ['Underwear', 'Armour', 'Helmet']) {
    story.entities.push({ ...copy(shirt), id: layer, name: layer, requiredSlots: [layer], flagGrants: [] });
    story.copies.push({ id: layer + '-copy', definition: layer, name: layer, owner: 'player', equipped: true, values: {} });
  }
  return story;
}
