// Small authored example used only by tests. Never inserted into user documents.
import { always, newChoice, newPassage, newScene, newStory, Step, Story, uid, newFlag, variableKey } from '../models/story.model';
export function storyFixture(): Story {
  const story = newStory('story');
  story.flags = [
    { ...newFlag(), id: 'trust', name: 'Trust', type: 'number', initial: 0, visible: true },
    { ...newFlag(), id: 'secret', name: 'Secret learned' },
    { ...newFlag(), id: 'weather', name: 'Weather', type: 'text', initial: 'Sunny', visible: true },
  ];
  const scenes = ['Arrival', 'Questioned', 'Courtyard', 'Escape'].map((title) => {
    const scene = newScene();
    scene.title = scene.passages[0].title = title;
    scene.passages[0].text = 'Trust: [[property:' + variableKey('trust') + ']]. Weather: [[property:' + variableKey('weather') + ']].';
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
      condition: { ...always(), kind: 'property', target: variableKey('trust'), op: 'gte', value: 0 },
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
  second.title = 'A response';
  second.text = 'Your help mattered. Trust: [[property:' + variableKey('trust') + ']].';
  const help = newChoice();
  help.label = 'Help';
  help.steps = [
    { id: uid(), kind: 'effect', effect: { kind: 'add', target: variableKey('trust'), value: 1 } },
    { id: uid(), kind: 'effect', effect: { kind: 'addFlag', target: 'secret', value: '' } },
    { id: uid(), kind: 'effect', effect: { kind: 'reveal', target: variableKey('secret'), value: '' } },
    { id: uid(), kind: 'go', scene: scenes[2].id, passage: second.id },
  ];
  scenes[2].passages[0].choices = [help];
  scenes[2].passages.push(second);
  const escape = newChoice();
  escape.steps = [go(3)];
  second.choices = [escape];
  scenes[3].passages[0].choices = ['Escape together', 'Leave alone'].map((label) => ({ ...newChoice(), label, steps: [{ id: uid(), kind: 'end' }] }));
  return story;
}
