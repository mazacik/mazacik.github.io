import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { StoryManagerComponent } from '../../story-manager.component';
import { StoryManagerStateService } from '../../services/story-manager-state.service';
import { StoryManagerSerializationService } from '../../services/story-manager-serialization.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { ApplicationService } from '../../../shared/services/application.service';
import { parseDocument } from '../../services/story-document';
import { storyFixture } from '../../engine/story-fixture';
import { startGame } from '../../engine/story-engine';
import { SceneMapComponent } from './scene-map.component';
import { PlayerComponent } from './player.component';
import { OutcomeEditorComponent } from './outcome-editor.component';
import { TextEditorComponent } from './text-editor.component';
import { always, newFlag, variableKey, uid } from '../../models/story.model';

function dragRow(source: HTMLElement, target: HTMLElement, after: boolean) {
  const dataTransfer = new DataTransfer();
  const bounds = target.getBoundingClientRect();
  const clientY = after ? bounds.bottom : bounds.top - 1;
  source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
  target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer, clientY }));
  target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer, clientY }));
  source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
}

describe('Story authoring workspace', () => {
  let persistence: any, notes: StoryManagerStateService, dialogs: any;
  beforeEach(async () => {
    const story = storyFixture();
    persistence = {
      ready: true,
      error: '',
      committing: false,
      data: { stories: [story], playthroughs: [startGame(story, 'Active')], articles: [] },
      save: jasmine.createSpy('save'),
      flush: jasmine.createSpy('flush'),
    };
    dialogs = { createConfirmation: jasmine.createSpy().and.resolveTo(true), createInput: jasmine.createSpy().and.resolveTo('New story'), create: jasmine.createSpy() };
    notes = new StoryManagerStateService(dialogs, persistence);
    notes.articles = parseDocument({
      articles: [
        { id: 'story', title: 'My story', text: '', childIds: ['note'], folder: true },
        { id: 'note', title: 'My idea', text: 'Keep this idea', childIds: [], folder: false },
        { id: 'loose', title: 'Loose idea', text: 'Unassigned', childIds: [], folder: false },
      ],
    }).articles;
    await TestBed.configureTestingModule({
      imports: [StoryManagerComponent],
      providers: [
        { provide: StoryManagerStateService, useValue: notes },
        { provide: StoryManagerSerializationService, useValue: persistence },
        { provide: DialogService, useValue: dialogs },
        { provide: ApplicationService, useValue: { addHeaderButtons() {}, removeHeaderButtons() {}, changes: signal(false) } },
      ],
    }).compileComponents();
  });
  it('shows only notes, variables and scene counts in the library', () => {
    const fixture = TestBed.createComponent(StoryManagerComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.story-card') as HTMLElement;
    expect(Array.from(card.querySelectorAll('.story-counts > span')).map((node) => node.textContent.trim())).toEqual(['1 notes', '4 scenes', '3 variables']);
    card.querySelector<HTMLElement>('.story-counts').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.tab).toBe('Notes');
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('creates scenes and passages without any entity controls', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Scenes');
    c.addScene();
    c.addPassage();
    c.addChoice();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.scene.passages.length).toBe(2);
    expect(fixture.nativeElement.querySelector('story-text-editor')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toMatch(/Player character|Speaker|Inventory|Equipment/);
    expect(notes.articles[1].text).toBe('Keep this idea');
    expect(persistence.save).toHaveBeenCalled();
  });
  it('opens variable and scene validation targets', () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.openIssue({ flag: 'trust', message: 'Fix variable' });
    expect(c.tab).toBe('Variables');
    expect(c.flagId).toBe('trust');
    const scene = c.story.scenes[2];
    c.openIssue({ scene: scene.id, passage: scene.passages[1].id, message: 'Fix passage' });
    expect(c.tab).toBe('Scenes');
    expect(c.passageId).toBe(scene.passages[1].id);
  });
  it('inserts only variable references and keeps them after renaming', async () => {
    const fixture = TestBed.createComponent(TextEditorComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    c.text = 'Weather: [[';
    editor.value = c.text;
    editor.selectionStart = c.text.length;
    c.update(c.text, editor);
    expect(c.show).toBeTrue();
    expect(c.references.map((reference) => reference.label)).toEqual(['Trust', 'Secret learned', 'Weather']);
    const token = c.references.find((reference) => reference.label === 'Weather').token;
    c.insert(token, editor);
    expect(c.text).toBe('Weather: ' + token);
    c.story.flags.find((variable) => variable.id === 'weather').name = 'Forecast';
    expect(c.preview).toBe('Weather: {Forecast}');
    c.query = 'Forecast';
    expect(c.references).toEqual([{ label: 'Forecast', token }]);
  });
  it('creates single-use choices and exposes a Repeatable checkbox in the editor', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Scenes');
    c.selectScene(c.story.start);
    c.addChoice();
    const choice = c.passage.choices[c.passage.choices.length - 1];
    fixture.detectChanges();
    await fixture.whenStable();
    const label = Array.from(fixture.nativeElement.querySelectorAll('#choice-' + choice.id + ' label') as NodeListOf<HTMLLabelElement>).find((label) => label.textContent.trim() === 'Repeatable');
    const checkbox = label.querySelector('input');
    expect(checkbox.checked).toBeFalse();
    checkbox.click();
    fixture.detectChanges();
    expect(choice.repeatable).toBeTrue();
    expect(persistence.save).toHaveBeenCalled();
  });
  it('renders story folders and existing notes, without saving on open', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('My story');
    fixture.componentInstance.open(notes.articles[0]);
    expect(notes.current).toBe(notes.articles[1]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.note-text').value).toBe('Keep this idea');
    expect(Array.from(fixture.nativeElement.querySelectorAll('nav button') as NodeListOf<HTMLButtonElement>).map((button) => button.textContent.trim())).toEqual([
      'Notes',
      'Variables',
      'Scenes',
      'Play',
    ]);
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('confirms note deletion and clears the editor without selecting another story or folder', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent);
    const folder = notes.articles[0],
      note = notes.articles[1];
    const playableBefore = JSON.stringify(persistence.data);
    fixture.componentInstance.open(folder);
    notes.current = note;
    notes.searchResults = [note];
    fixture.detectChanges();
    const deleteButton = (Array.from(fixture.nativeElement.querySelectorAll('.note-actions button')) as HTMLButtonElement[]).find((button) => button.textContent.trim() === 'Delete');
    dialogs.createConfirmation.and.resolveTo(false);
    deleteButton.click();
    await fixture.whenStable();
    expect(notes.current).toBe(note);
    expect(notes.articles).toContain(note);
    expect(persistence.save).not.toHaveBeenCalled();
    dialogs.createConfirmation.and.resolveTo(true);
    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(dialogs.createConfirmation).toHaveBeenCalled();
    expect(notes.articles).not.toContain(note);
    expect(folder.children).not.toContain(note);
    expect(notes.searchResults).not.toContain(note);
    expect(notes.current).toBeNull();
    expect(notes.articles.some((article) => article.id === 'loose')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.note-text')).toBeNull();
    expect(persistence.save).toHaveBeenCalledOnceWith(true);
    expect(JSON.stringify(persistence.data)).toBe(playableBefore);
  });
  it('does not open notes outside a story or create or move a note to the root', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(null);
    expect(c.story).toBeUndefined();
    expect(notes.getVisibleRoot()).toEqual([]);
    await notes.create(null, false);
    expect(dialogs.createInput).not.toHaveBeenCalled();
    expect(notes.moveArticle(notes.articles[1], null)).toBeFalse();
    c.open(notes.articles[0]);
    c.open(notes.articles[1]);
    expect(c.folder).toBe(notes.articles[0]);
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('exposes flag editing and cancels affected games when flags change', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Variables');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Create variable');
    c.story.flags.push(newFlag());
    c.changed();
    expect(persistence.data.playthroughs[0].status).toBe('canceled');
    expect(notes.articles[1].text).toBe('Keep this idea');
  });
  it('uses the persistent tabs as the single Play and editor navigation', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent);
    fixture.componentInstance.open(notes.articles[0]);
    fixture.detectChanges();
    const tabs = Array.from(fixture.nativeElement.querySelectorAll('nav button')) as HTMLButtonElement[];
    expect(fixture.nativeElement.querySelectorAll('header nav button').length).toBe(4);
    tabs.find((b) => b.textContent.trim() === 'Play').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('story-player')).not.toBeNull();
    tabs.find((b) => b.textContent.trim() === 'Notes').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-sidebar')).not.toBeNull();
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('drags flags without changing selection or playthroughs and ignores external, filtered, and no-op drops', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    persistence.data.stories[0].flags = [newFlag(), newFlag(), newFlag()];
    const [first, second, third] = persistence.data.stories[0].flags;
    c.open(notes.articles[0]);
    c.setTab('Variables');
    fixture.detectChanges();
    const revision = c.story.revision;
    const row = (id: string) => fixture.nativeElement.querySelector(`[data-reorder-id="${id}"]`) as HTMLButtonElement;
    expect(fixture.nativeElement.querySelector('.list-panel story-reorder')).toBeNull();
    dragRow(row(first.id), row(third.id), true);
    fixture.detectChanges();
    expect(c.story.flags.map((flag) => flag.id)).toEqual([second.id, third.id, first.id]);
    expect(row(first.id).classList.contains('active')).toBeTrue();
    expect(c.story.revision).toBe(revision);
    expect(persistence.data.playthroughs[0].status).toBe('active');
    expect(persistence.save).toHaveBeenCalledTimes(1);
    dragRow(row(third.id), row(first.id), false);
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', second.id);
    row(first.id).dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
    const search = fixture.nativeElement.querySelector('[aria-label="Search variables"]') as HTMLInputElement;
    search.value = first.name;
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    dragRow(row(first.id), row(second.id), false);
    expect(c.story.flags.map((flag) => flag.id)).toEqual([second.id, third.id, first.id]);
    expect(persistence.save).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.dragging, .drop-before, .drop-after')).toBeNull();
    row(first.id).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, altKey: true, key: 'ArrowUp' }));
    expect(persistence.save).toHaveBeenCalledTimes(1);
    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    row(first.id).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, altKey: true, key: 'ArrowUp' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.story.flags.map((flag) => flag.id)).toEqual([second.id, first.id, third.id]);
    expect(persistence.save).toHaveBeenCalledTimes(2);
    expect(c.story.revision).toBe(revision);
    expect(persistence.data.playthroughs[0].status).toBe('active');
  });
  it('cancels only the edited story’s games and preserves note-only associations', () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      component = fixture.componentInstance;
    component.open(notes.articles[0]);
    const other = { ...persistence.data.playthroughs[0], id: uid(), storyId: 'other' };
    persistence.data.playthroughs.push(other);
    component.story.scenes[0].noteIds.push('note');
    component.changed();
    expect(persistence.data.playthroughs[0].status).toBe('active');
    component.story.scenes[0].passages[0].text = 'Edited dialogue';
    component.changed();
    expect(persistence.data.playthroughs[0].status).toBe('canceled');
    expect(other.status).toBe('active');
    expect(notes.articles[1].text).toBe('Keep this idea');
  });
  it('duplicates scenes with new IDs and preserves internal passage connections', () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    const original = c.story.scenes[2];
    c.selectScene(original.id);
    c.duplicateScene();
    expect(c.scene.id).not.toBe(original.id);
    const go = c.scene.passages[0].choices[0].steps.find((s) => s.kind === 'go');
    expect(go?.kind === 'go' && go.scene).toBe(c.scene.id);
    expect(go?.kind === 'go' && go.passage).toBe(c.scene.passages[1].id);
  });
  it('switches map, connection editor, settings and mobile list without changing the document', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Scenes');
    fixture.detectChanges();
    const before = JSON.stringify(persistence.data);
    const source = c.story.scenes[0],
      passage = source.passages[0],
      choice = passage.choices[0];
    const map = fixture.debugElement.query((el) => el.componentInstance instanceof SceneMapComponent).componentInstance as SceneMapComponent;
    map.selectScene.emit(source.id);
    fixture.detectChanges();
    expect(c.sceneView).toBe('editor');
    expect(fixture.nativeElement.querySelector('story-scene-map')).toBeNull();
    const back = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((b) => b.textContent.includes('Back to map'));
    back.click();
    fixture.detectChanges();
    expect(c.sceneId).toBe(source.id);
    const restoredMap = fixture.debugElement.query((el) => el.componentInstance instanceof SceneMapComponent).componentInstance as SceneMapComponent;
    expect(restoredMap.selected).toBe(source.id);
    restoredMap.selectChoice.emit({ scene: source.id, passage: passage.id, choice: choice.id });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.sceneView).toBe('editor');
    expect(c.passageId).toBe(passage.id);
    expect(fixture.nativeElement.querySelector('#choice-' + choice.id)).not.toBeNull();
    c.showStorySettings();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main').textContent).toContain('Starting scene');
    expect(fixture.nativeElement.querySelector('main').textContent).not.toMatch(/player character|equipment|layer/i);
    expect(fixture.nativeElement.querySelector('aside').textContent).not.toContain('Player character');
    c.showSceneList();
    fixture.detectChanges();
    expect(c.sceneId).toBe(source.id);
    for (const tab of c.tabs) {
      c.setTab(tab);
      fixture.detectChanges();
    }
    expect(JSON.stringify(persistence.data)).toBe(before);
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('keeps story folders at the root and notes within their story', () => {
    const root = notes.articles[0],
      note = notes.articles[1];
    notes.storyFolder = root;
    expect(notes.moveArticle(root, note)).toBeFalse();
    expect(notes.moveArticle(note, null)).toBeFalse();
    expect(notes.getVisibleRoot()).toEqual([note]);
  });
  it('shows a full-width note panel with a return action on narrow screens', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    notes.current = notes.articles[1];
    fixture.nativeElement.style.width = '390px';
    fixture.detectChanges();
    await fixture.whenStable();
    const back = fixture.nativeElement.querySelector('.back-list') as HTMLButtonElement;
    expect(back.textContent).toContain('Notes');
    if (matchMedia('(max-width: 800px)').matches) {
      expect(getComputedStyle(fixture.nativeElement.querySelector('app-sidebar')).display).toBe('none');
      expect(fixture.nativeElement.querySelector('.note-editor').getBoundingClientRect().width).toBeLessThanOrEqual(390);
    }
    back.click();
    fixture.detectChanges();
    expect(notes.current).toBeNull();
  });
  it('renders recursive condition/random editors and creates a destination without dragging', async () => {
    const fixture = TestBed.createComponent(OutcomeEditorComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    c.steps = [];
    c.add('condition');
    const condition = c.steps[0];
    if (condition.kind === 'condition') condition.yes.push({ id: uid(), kind: 'random', branches: [{ id: uid(), percent: 100, steps: [{ id: uid(), kind: 'end' }] }] });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Otherwise');
    expect(fixture.nativeElement.textContent).toContain('probability (%)');
    c.add('go');
    const go = c.steps[1];
    if (go.kind === 'go') c.createScene(go);
    expect(c.story.scenes.length).toBe(5);
    expect(go.kind === 'go' && go.scene).toBe(c.story.scenes[4].id);
  });
});

describe('Scene map and reader', () => {
  it('hides consumed choices, restores them on undo, and keeps repeatable choices visible', async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [
        { provide: StoryManagerSerializationService, useValue: { data: { playthroughs: [] } } },
        { provide: DialogService, useValue: {} },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    const scene = c.story.scenes[0],
      passage = scene.passages[0],
      choice = passage.choices[0];
    choice.steps = [{ id: uid(), kind: 'go', scene: scene.id, passage: passage.id }];
    choice.unavailable = 'disabled';
    c.testScene = scene.id;
    c.ngOnChanges();
    await c.start();
    expect(c.choices).toContain(choice);
    await c.select(choice.id);
    fixture.detectChanges();
    expect(c.choices).not.toContain(choice);
    expect(c.allowed(choice.id)).toBeFalse();
    await c.undo();
    expect(c.choices).toContain(choice);
    expect(c.allowed(choice.id)).toBeTrue();
    choice.repeatable = true;
    await c.select(choice.id);
    expect(c.choices).toContain(choice);
    expect(c.allowed(choice.id)).toBeTrue();
    await c.select(choice.id);
    expect(c.error).toBe('');
  });
  it('only offers random test overrides when the story has random outcomes', async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [
        { provide: StoryManagerSerializationService, useValue: { data: { playthroughs: [] } } },
        { provide: DialogService, useValue: {} },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    c.testScene = c.story.start;
    c.ngOnChanges();
    fixture.detectChanges();
    const summaries = () => Array.from(fixture.nativeElement.querySelectorAll('summary') as NodeListOf<HTMLElement>).map((s) => s.textContent.trim());
    expect(summaries()).toContain('Chance outcomes');
    c.story.scenes.forEach((s) => s.passages.forEach((p) => p.choices.forEach((choice) => (choice.steps = []))));
    fixture.detectChanges();
    expect(summaries()).not.toContain('Chance outcomes');
    expect(summaries()).toContain('Test starting situation');
  });
  it('automatically lays out disconnected scenes, merged branches and loops with selectable edges', async () => {
    await TestBed.configureTestingModule({ imports: [SceneMapComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SceneMapComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    await c.layout();
    fixture.detectChanges();
    expect(c.nodes.length).toBe(4);
    expect(c.edges.length).toBeGreaterThan(4);
    expect(c.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('[data-node]').length).toBe(4);
    const select = jasmine.createSpy();
    c.selectScene.subscribe(select);
    fixture.nativeElement.querySelector('[data-node]').dispatchEvent(new MouseEvent('click'));
    expect(select).toHaveBeenCalledWith(c.story.scenes[0].id);
  });
  it('hides secret descriptions, handles availability and keeps testing isolated with undo', async () => {
    const story = storyFixture();
    story.flags[1].description = 'Secret description';
    const persistence = { data: { playthroughs: [] }, commit: jasmine.createSpy() };
    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [
        { provide: StoryManagerSerializationService, useValue: persistence },
        { provide: DialogService, useValue: {} },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = story;
    c.testScene = story.start;
    c.ngOnChanges();
    await c.start();
    const choice = story.scenes[0].passages[0].choices[0];
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Secret description');
    expect(fixture.nativeElement.textContent).not.toContain('Private secret');
    const random = c.randomSteps[0].step;
    c.forced[random.id] = 0;
    await c.select(choice.id);
    expect(c.game.scene).toBe(story.scenes[2].id);
    await c.undo();
    expect(c.game.scene).toBe(story.start);
    expect(persistence.commit).not.toHaveBeenCalled();
    choice.available = { ...always(), kind: 'known', target: variableKey('secret') };
    choice.unavailable = 'hidden';
    expect(c.choices.length).toBe(0);
    choice.unavailable = 'disabled';
    expect(c.choices.length).toBe(1);
    expect(c.allowed(choice.id)).toBeFalse();
  });
});
