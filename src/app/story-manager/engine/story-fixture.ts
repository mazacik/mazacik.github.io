// Small authored example used only by tests. Never inserted into user documents.
import { always, Entity, newChoice, newPassage, newScene, newStory, Step, Story, uid } from '../models/story.model';
export function storyFixture(): Story {
  const story = newStory('story');
  story.slots = ['Head', 'Body', 'Legs', 'Feet'];
  const entity = (id: string, kind: Entity['kind']): Entity => ({
    id,
    name: id,
    kind,
    description: 'Description of ' + id,
    notes: 'Private secret',
    known: true,
    properties: [],
  });
  const player = entity('player', 'character'),
    mira = entity('Mira', 'character'),
    key = entity('key', 'object'),
    coat = entity('coat', 'equipment');
  coat.requiredSlots = ['Body'];
  player.inventory = [{ id: 'key-row', target: 'key', quantity: 1, equipped: false }];
  story.copies = [{ id: 'coat-copy', definition: 'coat', name: 'coat', owner: 'player', equipped: true, values: {} }];
  mira.known = false;
  mira.properties = [{ id: 'trust', name: 'Trust', type: 'number', initial: 0, known: true }];
  story.entities = [player, mira, key, coat];
  story.player = player.id;
  story.properties = [{ id: 'secret', name: 'Secret learned', type: 'boolean', initial: false, known: true }];
  const scenes = ['Arrival', 'Questioned', 'Courtyard', 'Escape'].map((title) => {
    const scene = newScene();
    scene.title = title;
    scene.passages[0].title = title;
    scene.passages[0].text = 'Meet [[character:Mira]] with [[object:key]]. Trust: [[property:trust]].';
    return scene;
  });
  story.scenes = scenes;
  story.start = scenes[0].id;
  const go = (index: number): Step => ({ id: uid(), kind: 'go', scene: scenes[index].id, passage: '' });
  const c = newChoice();
  c.label = 'Convince the guard';
  c.steps = [
    {
      id: uid(),
      kind: 'condition',
      condition: { ...always(), kind: 'wears', target: 'coat-copy', actor: 'player' },
      yes: [
        {
          id: uid(),
          kind: 'random',
          branches: [
            { id: uid(), percent: 50, steps: [go(2)] },
            { id: uid(), percent: 50, steps: [go(1)] },
          ],
        },
      ],
      no: [go(1)],
    },
  ];
  scenes[0].passages[0].choices = [c];
  const question = newChoice();
  question.steps = [go(2)];
  scenes[1].passages[0].choices = [question];
  const second = newPassage();
  second.title = 'Mira responds';
  second.text = 'Your help mattered.';
  const give = newChoice();
  give.label = 'Give Mira the key';
  give.available = { ...always(), kind: 'owns', target: 'key', actor: 'player' };
  give.steps = [
    { id: uid(), kind: 'effect', effect: { kind: 'transferQuantity', target: 'key', from: 'player', actor: 'Mira', value: 1 } },
    { id: uid(), kind: 'effect', effect: { kind: 'reveal', target: 'Mira', actor: '', value: '' } },
    { id: uid(), kind: 'effect', effect: { kind: 'add', target: 'trust', actor: '', value: 1 } },
    { id: uid(), kind: 'go', scene: scenes[2].id, passage: second.id },
  ];
  scenes[2].passages[0].choices = [give];
  scenes[2].passages.push(second);
  const escape = newChoice();
  escape.steps = [go(3)];
  second.choices = [escape];
  const end = newChoice();
  end.label = 'Escape together';
  end.steps = [{ id: uid(), kind: 'end' }];
  const alone = newChoice();
  alone.label = 'Leave alone';
  alone.steps = [{ id: uid(), kind: 'end' }];
  scenes[3].passages[0].choices = [end, alone];
  return story;
}
