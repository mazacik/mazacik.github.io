import { Entity, newChoice, newFlag, newScene, newStory, Story } from '../models/story.model';
export function inventoryFixture(): Story {
  const s = newStory('inventory-story');
  const entity = (id: string, kind: Entity['kind']): Entity => ({
    id,
    kind,
    name: id,
    description: 'Description of ' + id,
    notes: 'Private',
    known: true,
    properties: [],
    inventory: [],
    flagGrants: [],
  });
  const player = entity('player', 'character'),
    npc = entity('npc', 'character'),
    dagger = entity('dagger', 'equipment'),
    apple = entity('apple', 'object');
  dagger.requiredSlots = ['Hand'];
  dagger.properties = [{ id: 'durability', name: 'Durability', type: 'number', initial: 100, known: true }];
  s.slots = ['Hand'];
  s.player = player.id;
  s.flags = [
    { ...newFlag(), scope: 'character', id: 'armed', name: 'Armed' },
    { ...newFlag(), scope: 'character', id: 'ready', name: 'Ready' },
  ];
  dagger.flagGrants = [
    { flag: 'armed', when: 'owned' },
    { flag: 'ready', when: 'equipped' },
  ];
  s.entities = [player, npc, dagger, apple];
  player.inventory = [{ id: 'b', target: 'apple', quantity: 5, equipped: false }];
  s.copies = Array.from({ length: 5 }, (_, i) => ({ id: 'dagger-' + (i + 1), definition: 'dagger', name: 'Dagger ' + (i + 1), owner: i < 3 ? 'player' : 'npc', equipped: false, values: {} }));
  const scene = newScene(),
    choice = newChoice();
  choice.steps = [{ id: 'finish', kind: 'end' }];
  scene.passages[0].choices = [choice];
  s.scenes = [scene];
  s.start = scene.id;
  return s;
}
