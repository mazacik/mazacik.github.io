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
import { always, newFlag, newUnlockMethod, variableKey, uid } from '../../models/story.model';

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
  it('separates entity sections and remembers them across entities without changing story data or saves', () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Equipment');
    const equipment = c.entity;
    c.story.entities.push({ ...equipment, id: 'second-equipment', name: 'Second equipment' });
    const before = JSON.stringify(persistence.data);
    fixture.detectChanges();
    const click = (section: string) => {
      (fixture.nativeElement.querySelector('#detail-tab-' + section) as HTMLButtonElement).click();
      fixture.detectChanges();
    };
    expect(c.detailTabs).toEqual(['General', 'Variables', 'Effects', 'Locks']);
    expect(fixture.nativeElement.querySelector('story-properties')).toBeNull();
    click('Variables');
    expect(fixture.nativeElement.querySelector('story-properties')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('story-locks')).toBeNull();
    c.entityId = 'second-equipment';
    fixture.detectChanges();
    expect(c.detailSection).toBe('Variables');
    click('Locks');
    expect(fixture.nativeElement.querySelector('story-locks')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('story-properties')).toBeNull();
    c.setTab('Characters');
    fixture.detectChanges();
    expect(c.detailTabs).toEqual(['Variables', 'Inventory', 'Equipment']);
    click('Inventory');
    expect(fixture.nativeElement.querySelector('story-inventory-editor')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('story-character-equipment')).toBeNull();
    click('Equipment');
    expect(fixture.nativeElement.querySelector('story-character-equipment')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('story-inventory-editor')).toBeNull();
    c.setTab('Equipment');
    fixture.detectChanges();
    expect(c.detailSection).toBe('Locks');
    c.setTab('Items');
    fixture.detectChanges();
    expect(c.detailTabs).toEqual(['Variables', 'Effects']);
    click('Effects');
    expect(fixture.nativeElement.querySelector('story-entity-flags')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('story-properties')).toBeNull();
    expect(JSON.stringify(persistence.data)).toBe(before);
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('shows Locks only for equipment and restores that section after visiting a type', () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Equipment');
    c.selectDetailSection('Locks');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('story-locks')).not.toBeNull();
    c.setEquipmentView('types');
    c.addEntity();
    fixture.detectChanges();
    expect(c.detailTabs).toEqual(['General', 'Variables', 'Effects']);
    expect(fixture.nativeElement.querySelector('#detail-tab-Locks')).toBeNull();
    expect(fixture.nativeElement.querySelector('story-locks')).toBeNull();
    expect(c.detailSection).toBe('General');
    c.setEquipmentView('variants');
    fixture.detectChanges();
    expect(c.detailSection).toBe('Locks');
    expect(fixture.nativeElement.querySelector('story-locks')).not.toBeNull();
  });
  it('marks invalid sections and opens validation targets including the exact equipment copy', () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Equipment');
    c.entity.lockable = true;
    c.entity.unlockMethods = [{ ...newUnlockMethod(), chance: 150 }];
    c.entity.flagGrants = [{ flag: 'missing-variable', when: 'equipped' }];
    c.story.copies[0].values = { 'missing-variable': 10 };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#detail-tab-Locks .tab-error')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#detail-tab-Effects .tab-error')).not.toBeNull();
    const lockIssue = c.issues.find((i) => i.entity === c.entityId && i.section === 'Locks');
    expect(lockIssue).toBeDefined();
    c.openIssue(lockIssue);
    fixture.detectChanges();
    expect(c.detailSection).toBe('Locks');
    expect(fixture.nativeElement.querySelector('story-locks')).not.toBeNull();
    const copyIssue = c.issues.find((i) => i.copy === c.story.copies[0].id && i.section === 'Equipment');
    expect(copyIssue).toBeDefined();
    c.openIssue(copyIssue);
    fixture.detectChanges();
    expect(c.tab).toBe('Characters');
    expect(c.detailSection).toBe('Equipment');
    expect(fixture.nativeElement.querySelector('#equipment-copy-' + copyIssue.copy).open).toBeTrue();
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('supports arrow, Home and End navigation with one keyboard tab stop and an associated panel', () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Equipment');
    fixture.detectChanges();
    const press = (key: string) => {
      const current = fixture.nativeElement.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
      current.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('[role="tab"][tabindex="0"]').length).toBe(1);
      expect(fixture.nativeElement.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('detail-tab-' + c.detailSection);
    };
    press('ArrowLeft');
    expect(c.detailSection).toBe('Locks');
    press('ArrowRight');
    expect(c.detailSection).toBe('General');
    press('End');
    expect(c.detailSection).toBe('Locks');
    press('Home');
    expect(c.detailSection).toBe('General');
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('duplicates contextual equipment variables without retaining references to the original schema', () => {
    const c = TestBed.createComponent(StoryManagerComponent).componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Equipment');
    const source = c.entity;
    source.properties = [{ id: 'charge', name: 'Charge', type: 'number', initial: 10, known: true }];
    source.lockable = true;
    source.unlockMethods = [{ ...newUnlockMethod(), success: { ...always(), kind: 'property', target: variableKey('copy', '@equipment', 'charge'), op: 'gt', value: 0 } }];
    c.duplicateEntity();
    expect(c.entity.properties[0].id).not.toBe('charge');
    expect(c.entity.unlockMethods[0].success.target).toBe(variableKey('copy', '@equipment', c.entity.properties[0].id));
    expect(source.unlockMethods[0].success.target).toBe(variableKey('copy', '@equipment', 'charge'));
  });
  it('creates equipment types and variants in separate views and opens the owning type', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Equipment');
    c.setEquipmentView('types');
    c.addEntity();
    const type = c.entity;
    type.name = 'Sword';
    type.requiredSlots = ['Body'];
    expect(type.equipmentRole).toBe('type');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Inherits from');
    const create = Array.from(fixture.nativeElement.querySelectorAll('.detail-actions button') as NodeListOf<HTMLButtonElement>).find((b) => b.textContent.trim() === 'Create equipment');
    create.click();
    fixture.detectChanges();
    const variant = c.entity;
    expect(variant.equipmentRole).toBe('variant');
    expect(variant.parentId).toBe(type.id);
    expect(c.equipmentView).toBe('variants');
    expect(c.entities).not.toContain(type);
    const before = JSON.stringify(persistence.data);
    const open = Array.from(fixture.nativeElement.querySelectorAll('.detail-actions button') as NodeListOf<HTMLButtonElement>).find((b) => b.textContent.trim() === 'Open type');
    open.click();
    fixture.detectChanges();
    expect(c.entity).toBe(type);
    expect(c.entities).not.toContain(variant);
    expect(JSON.stringify(persistence.data)).toBe(before);
  });
  it('separates keys from items and navigates to inherited templates and exact character copies without saving', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    const key = c.story.entities.find((e) => e.id === 'key');
    const template = c.story.entities.find((e) => e.kind === 'equipment');
    template.lockable = true;
    template.keyItems = [key.id];
    const variant = { ...template, id: 'variant', name: 'Inherited lock', parentId: template.id, keyItems: undefined, properties: [] };
    c.story.entities.push(variant);
    const instance = c.story.copies[0];
    instance.keyItems = [key.id];
    c.setTab('Items');
    expect(c.entities).not.toContain(key);
    c.setTab('Keys');
    expect(c.entity).toBe(key);
    expect(c.keyTargets.map((target) => target.id)).toEqual([template.id, variant.id, instance.id]);
    fixture.detectChanges();
    const before = JSON.stringify(persistence.data);
    const targetButton = Array.from(fixture.nativeElement.querySelectorAll('.detail-form button') as NodeListOf<HTMLButtonElement>).find((b) => b.textContent.trim() === variant.name);
    targetButton.click();
    fixture.detectChanges();
    expect(c.tab).toBe('Equipment');
    expect(c.entity).toBe(variant);
    c.setTab('Keys');
    c.openKeyTarget(c.keyTargets.find((target) => target.id === instance.id));
    fixture.detectChanges();
    expect(c.tab).toBe('Characters');
    expect(c.entity.id).toBe(instance.owner);
    expect(fixture.nativeElement.querySelector('#equipment-copy-' + instance.id).open).toBeTrue();
    expect(JSON.stringify(persistence.data)).toBe(before);
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('creates, duplicates and reorders keys independently of ordinary items', () => {
    const c = TestBed.createComponent(StoryManagerComponent).componentInstance;
    c.open(notes.articles[0]);
    const items = c.story.entities.filter((e) => e.kind === 'object');
    c.setTab('Keys');
    c.addEntity();
    const key = c.entity;
    expect(key.key).toBeTrue();
    expect(c.selectedEntityLabel).toBe('key');
    c.duplicateEntity();
    const duplicate = c.entity;
    expect(duplicate.key).toBeTrue();
    c.moveEntity(duplicate.id, -1);
    expect(c.entities).toEqual([duplicate, key]);
    c.setTab('Items');
    expect(c.entities).toEqual(items);
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
      'Characters',
      'Equipment',
      'Items',
      'Keys',
      'Play',
    ]);
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('selects the first item on entering each detail view without saving and leaves empty views unselected', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.story.flags = [newFlag(), newFlag()];
    const before = JSON.stringify(persistence.data);
    for (const tab of ['Characters', 'Items', 'Equipment', 'Variables', 'Notes'] as const) {
      c.sceneSearch = 'no match';
      c.setTab(tab);
      fixture.detectChanges();
      await fixture.whenStable();
      if (tab === 'Notes') expect(c.currentNote).toBe(c.storyNotes[0]);
      else if (tab === 'Variables') expect(c.flagId).toBe(c.story.flags[0].id);
      else expect(c.entity).toBe(c.story.entities.find((entity) => entity.kind === (tab === 'Characters' ? 'character' : tab === 'Equipment' ? 'equipment' : 'object')));
      expect(fixture.nativeElement.querySelector('.detail-toolbar')).not.toBeNull();
      fixture.nativeElement.querySelector('.back-list').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.detail-toolbar')).toBeNull();
    }
    expect(JSON.stringify(persistence.data)).toBe(before);
    expect(persistence.save).not.toHaveBeenCalled();
    c.story.entities = [];
    c.story.flags = [];
    notes.storyFolder.children = [];
    for (const tab of ['Characters', 'Items', 'Equipment', 'Variables', 'Notes'] as const) {
      c.setTab(tab);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.detail-toolbar')).toBeNull();
    }
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
  it('opens a plain story card from its counts and shows separate content totals', async () => {
    const story = persistence.data.stories[0];
    story.scenes = story.scenes.slice(0, 2);
    story.entities = story.entities.filter((e) => e.kind === 'character');
    story.flags = [newFlag()];
    const fixture = TestBed.createComponent(StoryManagerComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const card: HTMLButtonElement = fixture.nativeElement.querySelector('.story-card');
    expect(card.tagName).toBe('BUTTON');
    expect(card.querySelector('button, a, .link')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toMatch(/STORY MANAGER|Your stories|Unassigned notes|words|Open story|Rename|Delete/);
    expect(Array.from(card.querySelectorAll('.story-counts > span')).map((row) => row.textContent.trim())).toEqual([
      '1 notes',
      '2 scenes',
      '2 characters',
      '0 items',
      '0 keys',
      '0 equipment',
      '1 variables',
    ]);
    const title = card.querySelector<HTMLElement>('.story-card-title');
    expect(getComputedStyle(title).marginTop).toBe('0px');
    expect(getComputedStyle(title).textDecorationLine).toBe('none');
    card.querySelector<HTMLElement>('.story-counts').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.story.id).toBe(story.id);
    expect(fixture.nativeElement.querySelector('app-sidebar')).not.toBeNull();
    expect(persistence.save).not.toHaveBeenCalled();
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
    expect(fixture.nativeElement.querySelectorAll('header nav button').length).toBe(8);
    tabs.find((b) => b.textContent.trim() === 'Play').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('story-player')).not.toBeNull();
    tabs.find((b) => b.textContent.trim() === 'Notes').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-sidebar')).not.toBeNull();
    expect(persistence.save).not.toHaveBeenCalled();
  });
  it('persists list ordering without canceling games and keeps selection and entity kinds intact', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Characters');
    c.entityId = 'player';
    c.story.entities.push({ ...c.story.entities.find((e) => e.kind === 'object'), id: 'second-object' });
    c.changed();
    persistence.data.playthroughs[0].status = 'active';
    const originalObjects = c.story.entities.filter((e) => e.kind === 'object').map((e) => e.id);
    const revision = c.story.revision;
    fixture.detectChanges();
    await fixture.whenStable();
    const row = (id: string) => fixture.nativeElement.querySelector(`[data-reorder-id="${id}"]`) as HTMLButtonElement;
    expect(fixture.nativeElement.querySelector('.list-panel story-reorder')).toBeNull();
    dragRow(row('player'), row('Mira'), true);
    fixture.detectChanges();
    expect(c.characters.map((e) => e.id)).toEqual(['Mira', 'player']);
    expect(c.story.entities.filter((e) => e.kind === 'object').map((e) => e.id)).toEqual(originalObjects);
    expect(c.entityId).toBe('player');
    expect(persistence.data.playthroughs[0].status).toBe('active');
    expect(c.story.revision).toBe(revision);
    expect(persistence.save).toHaveBeenCalled();
    c.sceneSearch = 'player';
    fixture.detectChanges();
    expect(row('player').draggable).toBeFalse();
    c.setTab('Items');
    fixture.detectChanges();
    const charactersBefore = c.characters.map((entity) => entity.id);
    dragRow(row(originalObjects[1]), row(originalObjects[0]), false);
    fixture.detectChanges();
    expect(c.story.entities.filter((entity) => entity.kind === 'object').map((entity) => entity.id)).toEqual([...originalObjects].reverse());
    expect(c.characters.map((entity) => entity.id)).toEqual(charactersBefore);
    expect(c.entityId).toBe(originalObjects[0]);
    expect(c.story.revision).toBe(revision);
    c.story.scenes.reverse();
    c.changed();
    expect(persistence.data.playthroughs[0].status).toBe('active');
    const scene = c.story.scenes.find((s) => s.passages[0].choices.length > 1);
    scene.passages[0].choices.reverse();
    c.changed();
    expect(persistence.data.playthroughs[0].status).toBe('canceled');
    expect(notes.articles[1].text).toBe('Keep this idea');
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
    component.story.entities[0].notes = 'Private writing note';
    component.changed();
    expect(persistence.data.playthroughs[0].status).toBe('active');
    component.story.scenes[0].passages[0].text = 'Edited dialogue';
    component.changed();
    expect(persistence.data.playthroughs[0].status).toBe('canceled');
    expect(other.status).toBe('active');
    expect(notes.articles[1].text).toBe('Keep this idea');
  });
  it('renames characters, objects, and flags directly in their titles', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.story.flags = [newFlag()];
    for (const tab of ['Characters', 'Items', 'Equipment', 'Variables'] as const) {
      c.setTab(tab);
      fixture.detectChanges();
      await fixture.whenStable();
      const item = tab === 'Variables' ? c.story.flags[0] : c.entity;
      const id = item.id;
      const title = fixture.nativeElement.querySelector('.detail-toolbar input.detail-title') as HTMLInputElement;
      expect(title.value).toBe(item.name);
      title.value = 'Renamed ' + tab;
      title.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(item.name).toBe(title.value);
      expect(item.id).toBe(id);
      expect(fixture.nativeElement.querySelector('.list-item.active').textContent).toContain(title.value);
      const labels = Array.from(fixture.nativeElement.querySelectorAll('.detail-form > label')) as HTMLLabelElement[];
      expect(labels.some((label) => label.textContent.trim() === 'Name')).toBeFalse();
    }
    expect(persistence.save).toHaveBeenCalled();
  });
  it('creates characters, objects, scenes, and passages through workspace actions', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Characters');
    c.addEntity();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Reader description');
    expect(fixture.nativeElement.querySelector('.detail-form')).not.toBeNull();
    expect(c.entity.kind).toBe('character');
    c.setTab('Items');
    c.addEntity();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.entity.kind).toBe('object');
    expect(c.entity.name).toBe('New item');
    expect(fixture.nativeElement.querySelector('[aria-label="Item name"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.list-footer').textContent).toContain('Create item');
    expect(fixture.nativeElement.textContent).not.toContain('Required layers');
    expect(fixture.nativeElement.textContent).not.toContain('Stackable');
    expect(fixture.nativeElement.textContent).not.toContain('Unique copies');
    c.setTab('Equipment');
    c.addEntity();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.entity.kind).toBe('equipment');
    expect(fixture.nativeElement.textContent).not.toContain('Stackable');
    expect(fixture.nativeElement.textContent).not.toContain('Unique copies');
    expect(fixture.nativeElement.textContent).toContain('Required layers');
    c.setTab('Scenes');
    c.addScene();
    c.addPassage();
    c.addChoice();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.scene.passages.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('What happens');
  });
  it('keeps equipment ordering separate and supports slots, duplication, issue links and deletion', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Equipment');
    const first = c.entity;
    c.addEntity();
    const added = c.entity;
    expect(added.equipmentRole).toBe('variant');
    expect(added.requiredSlots).toBeUndefined();
    c.setRequiredSlot(added, 'Head', true);
    c.setRequiredSlot(added, 'Body', true);
    const before = c.story.revision;
    const others = c.story.entities.filter((e) => e.kind !== 'equipment').map((e) => e.id);
    persistence.data.playthroughs[0].status = 'active';
    fixture.detectChanges();
    await fixture.whenStable();
    const row = (id: string) => fixture.nativeElement.querySelector(`[data-reorder-id="${id}"]`) as HTMLButtonElement;
    dragRow(row(added.id), row(first.id), false);
    fixture.detectChanges();
    expect(c.entities.map((e) => e.id)).toEqual([added.id, first.id]);
    expect(c.story.entities.filter((e) => e.kind !== 'equipment').map((e) => e.id)).toEqual(others);
    expect(c.entityId).toBe(added.id);
    expect(c.story.revision).toBe(before);
    expect(persistence.data.playthroughs[0].status).toBe('active');
    c.setRequiredSlot(added, 'Head', false);
    expect(c.story.revision).toBeGreaterThan(before);
    expect(persistence.data.playthroughs[0].status).toBe('canceled');
    c.duplicateEntity();
    const duplicate = c.entity;
    expect(duplicate.id).not.toBe(added.id);
    expect(duplicate.kind).toBe('equipment');
    expect(duplicate.requiredSlots).toEqual(['Body']);
    c.setTab('Items');
    c.openIssue({ entity: duplicate.id, message: 'Equipment issue' });
    expect(c.tab).toBe('Equipment');
    expect(c.entity).toBe(duplicate);
    c.deleteEntity();
    await fixture.whenStable();
    expect(c.story.entities.some((e) => e.id === duplicate.id)).toBeFalse();
    expect(c.story.entities.some((e) => e.id === added.id)).toBeTrue();
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
    expect(fixture.nativeElement.querySelector('main').textContent).toContain('Player character');
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
  it('keeps player selection in settings and preserves the first-character default', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Characters');
    for (const entity of c.characters) {
      c.entityId = entity.id;
      fixture.detectChanges();
      const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
      expect(buttons.some((b) => /Make player character|Player character/.test(b.textContent))).toBeFalse();
    }
    c.story.player = '';
    c.addEntity();
    const first = c.entityId;
    expect(c.story.player).toBe(first);
    c.addEntity();
    expect(c.story.player).toBe(first);
    c.setTab('Scenes');
    c.showStorySettings();
    fixture.detectChanges();
    await fixture.whenStable();
    const label = Array.from(fixture.nativeElement.querySelectorAll('label') as NodeListOf<HTMLLabelElement>).find((l) => l.textContent.includes('Player character'));
    const select = label.querySelector('select');
    select.value = c.entityId || c.characters[0].id;
    select.dispatchEvent(new Event('change'));
    expect(c.story.player).toBe(c.characters[0].id);
  });
  it('explains filtered reordering once beside search', async () => {
    const fixture = TestBed.createComponent(StoryManagerComponent),
      c = fixture.componentInstance;
    c.open(notes.articles[0]);
    c.setTab('Items');
    c.sceneSearch = 'k';
    fixture.detectChanges();
    await fixture.whenStable();
    const list = fixture.nativeElement.querySelector('.list-panel') as HTMLElement;
    expect(list.querySelector('.list-controls').textContent).toContain('Clear search to reorder');
    expect(list.querySelector('.list-scroll').textContent).not.toContain('Clear search');
    expect(list.querySelector('story-reorder')).toBeNull();
    const rows = Array.from(list.querySelectorAll<HTMLButtonElement>('[data-reorder-id]'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => !row.draggable)).toBeTrue();
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
    c.undo();
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
    c.inspected = 'Mira';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Description of Mira');
    expect(fixture.nativeElement.textContent).not.toContain('Private secret');
    const random = c.randomSteps[0].step;
    c.forced[random.id] = 0;
    await c.select(choice.id);
    expect(c.game.scene).toBe(story.scenes[2].id);
    c.undo();
    expect(c.game.scene).toBe(story.start);
    expect(persistence.commit).not.toHaveBeenCalled();
    choice.available = { ...always(), kind: 'known', target: 'Mira' };
    choice.unavailable = 'hidden';
    expect(c.choices.length).toBe(0);
    choice.unavailable = 'disabled';
    expect(c.choices.length).toBe(1);
    expect(c.allowed(choice.id)).toBeFalse();
  });
});
