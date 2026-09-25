import { CharacterEquipmentComponent } from './components/editor/character-equipment.component';
import { EntityDetailSection, variableScope } from './models/story.model';
import { EquipmentEditorComponent } from './components/editor/equipment-editor.component';
import { LayersEditorComponent } from './components/editor/layers-editor.component';
import { InventoryEditorComponent } from './components/editor/inventory-editor.component';
import { ReorderComponent } from './components/editor/reorder.component';
import { ListReorderDirective } from './components/editor/list-reorder.directive';
import { AutosizeTextareaDirective } from '../shared/directives/autosize-textarea.directive';
import { moveEntry, playableFingerprint } from './engine/story-order';
import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationSettingsComponent } from '../shared/dialogs/application-settings/application-settings.component';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { StoryManagerStateService } from './services/story-manager-state.service';
import { StoryManagerSerializationService } from './services/story-manager-serialization.service';
import { Article } from './models/article.class';
import {
  copy,
  isKey,
  resolveEquipment,
  parseVariableKey,
  variableKey,
  Entity,
  FlagDefinition,
  Issue,
  newChoice,
  newPassage,
  newScene,
  newStory,
  Passage,
  Property,
  Scene,
  Story,
  uid,
  walkSteps,
} from './models/story.model';
import { incomingReferences, validateStory } from './engine/story-validation';
import { SceneMapComponent } from './components/editor/scene-map.component';
import { PropertiesEditorComponent } from './components/editor/properties-editor.component';
import { TextEditorComponent } from './components/editor/text-editor.component';
import { ConditionEditorComponent } from './components/editor/condition-editor.component';
import { OutcomeEditorComponent } from './components/editor/outcome-editor.component';
import { PlayerComponent } from './components/editor/player.component';
import { FlagsEditorComponent } from './components/editor/flags-editor.component';
import { EntityFlagsComponent } from './components/editor/entity-flags.component';

@Component({
  selector: 'app-story-manager',
  imports: [
    EquipmentEditorComponent,
    CharacterEquipmentComponent,
    LayersEditorComponent,
    FormsModule,
    ReorderComponent,
    ListReorderDirective,
    AutosizeTextareaDirective,
    InventoryEditorComponent,
    SidebarComponent,
    SceneMapComponent,
    PropertiesEditorComponent,
    TextEditorComponent,
    ConditionEditorComponent,
    OutcomeEditorComponent,
    PlayerComponent,
    FlagsEditorComponent,
    EntityFlagsComponent,
  ],
  templateUrl: './story-manager.component.html',
  styleUrls: ['./components/editor/editor.scss', './components/editor/panels.scss', './story-manager.component.scss'],
})
export class StoryManagerComponent implements OnInit, OnDestroy {
  story: Story;
  tab: 'Notes' | 'Scenes' | 'Characters' | 'Items' | 'Keys' | 'Equipment' | 'Variables' | 'Play' = 'Notes';
  readonly tabs = ['Notes', 'Variables', 'Scenes', 'Characters', 'Equipment', 'Items', 'Keys', 'Play'] as const;
  focusCopyId = '';
  equipmentView: 'variants' | 'types' = 'variants';
  @ViewChild('entityDetailScroll') private entityDetailScroll?: ElementRef<HTMLElement>;
  private detailSections: Partial<Record<typeof this.tab, EntityDetailSection>> = {};
  flagId = '';
  sceneId = '';
  passageId = '';
  entityId = '';
  choiceId = '';
  search = '';
  sceneSearch = '';
  testScene = '';
  showValidation = false;
  sceneView: 'map' | 'editor' | 'settings' | 'list' = 'map';
  private editedFingerprint = '';
  private issueKey = '';
  private cachedIssues: ReturnType<typeof validateStory> = [];
  constructor(
    public notes: StoryManagerStateService,
    public persistence: StoryManagerSerializationService,
    private application: ApplicationService,
    private dialogs: DialogService,
  ) {}
  ngOnInit() {
    this.application.addHeaderButtons('start', [
      {
        id: 'story-back',
        tooltip: 'Back to stories',
        classes: 'fa-solid fa-arrow-left',
        onClick: () => this.home(),
        hidden: () => !this.story,
        disabled: () => this.persistence.committing,
      },
    ]);
    this.application.addHeaderButtons('end', [{ id: 'story-settings', tooltip: 'Settings', classes: 'fa-solid fa-gear', onClick: () => this.dialogs.create(ApplicationSettingsComponent) }]);
  }
  ngOnDestroy() {
    this.application.removeHeaderButtons(['story-back', 'story-settings']);
    this.persistence.flush();
  }
  @HostListener('window:beforeunload', ['$event'])
  unload(event: BeforeUnloadEvent) {
    if (this.application.changes()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  get folders() {
    return this.notes.getRoot()?.filter((a) => a.folder && a.title.toLowerCase().includes(this.search.toLowerCase())) ?? [];
  }
  get folder() {
    return this.notes.storyFolder;
  }
  storyStats(folder: Article) {
    const notes = folder.collectChildren().filter((article) => !article.folder);
    const story = this.persistence.data.stories.find((item) => item.id === folder.id);
    return [
      { label: 'notes', count: notes.length },
      { label: 'scenes', count: story?.scenes.length ?? 0 },
      { label: 'characters', count: story?.entities.filter((entity) => entity.kind === 'character').length ?? 0 },
      { label: 'items', count: story?.entities.filter((entity) => entity.kind === 'object' && !isKey(story, entity)).length ?? 0 },
      { label: 'keys', count: story?.entities.filter((entity) => isKey(story, entity)).length ?? 0 },
      { label: 'equipment', count: story?.entities.filter((entity) => entity.kind === 'equipment' && entity.equipmentRole !== 'type').length ?? 0 },
      { label: 'variables', count: story?.flags?.length ?? 0 },
    ];
  }
  get scene() {
    return this.story?.scenes.find((s) => s.id === this.sceneId);
  }
  get passage() {
    return this.scene?.passages.find((p) => p.id === this.passageId);
  }
  get entity() {
    return this.story?.entities.find((e) => e.id === this.entityId);
  }
  get characters() {
    return this.story?.entities.filter((e) => e.kind === 'character') ?? [];
  }
  get detailTabs(): EntityDetailSection[] {
    switch (this.tab) {
      case 'Equipment':
        return this.entity?.equipmentRole === 'type' ? ['General', 'Variables', 'Effects'] : ['General', 'Variables', 'Effects', 'Locks'];
      case 'Characters':
        return ['Variables', 'Inventory', 'Equipment'];
      case 'Items':
        return ['Variables', 'Effects'];
      case 'Keys':
        return ['Unlocks', 'Variables'];
      default:
        return [];
    }
  }
  get detailSection(): EntityDetailSection {
    const selected = this.detailSections[this.tab];
    return this.detailTabs.includes(selected) ? selected : this.detailTabs[0];
  }
  selectDetailSection(section: EntityDetailSection) {
    if (!this.detailTabs.includes(section)) return;
    this.detailSections[this.tab] = section;
    if (this.entityDetailScroll) this.entityDetailScroll.nativeElement.scrollTop = 0;
  }
  detailTabKey(event: KeyboardEvent, section: EntityDetailSection) {
    const tabs = this.detailTabs;
    let index = tabs.indexOf(section);
    if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else return;
    event.preventDefault();
    this.selectDetailSection(tabs[index]);
    (event.currentTarget as HTMLElement).parentElement.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index].focus();
  }
  detailCount(section: EntityDetailSection): number | undefined {
    let entity = this.entity;
    if (!entity) return undefined;
    if (entity.kind === 'equipment') {
      try {
        entity = resolveEquipment(this.story, entity.id);
      } catch {
        /* Keep invalid drafts editable. */
      }
    }
    switch (section) {
      case 'Variables':
        return entity.kind === 'character' ? (this.story.flags ?? []).filter((v) => variableScope(v) === 'character').length : entity.properties.length;
      case 'Effects':
        return (entity.flagGrants ?? []).filter((g) => !g.suppressed).length;
      case 'Inventory':
        return entity.inventory?.length ?? 0;
      case 'Equipment':
        return (this.story.copies ?? []).filter((c) => c.owner === entity.id).length;
      case 'Unlocks':
        return this.keyTargets.length;
      default:
        return undefined;
    }
  }
  detailIssues(section: EntityDetailSection) {
    return this.issues.filter((i) => i.entity === this.entityId && (this.detailTabs.includes(i.section) ? i.section : this.detailTabs[0]) === section);
  }
  get selectedEntityKind(): Entity['kind'] {
    return this.tab === 'Characters' ? 'character' : this.tab === 'Equipment' ? 'equipment' : 'object';
  }
  get selectedEntityLabel(): string {
    return this.tab === 'Equipment'
      ? this.equipmentView === 'types'
        ? 'equipment type'
        : 'equipment'
      : this.tab === 'Keys'
        ? 'key'
        : this.selectedEntityKind === 'object'
          ? 'item'
          : this.selectedEntityKind;
  }
  get entities() {
    return (
      this.story?.entities.filter(
        (e) =>
          this.entityCategory(e) === this.tab &&
          (this.tab !== 'Equipment' || (e.equipmentRole === 'type') === (this.equipmentView === 'types')) &&
          e.name.toLowerCase().includes(this.sceneSearch.toLowerCase()),
      ) ?? []
    );
  }
  setEquipmentView(view: 'variants' | 'types') {
    this.equipmentView = view;
    this.sceneSearch = '';
    this.entityId = this.entities[0]?.id ?? '';
  }
  createVariant(type = this.story.entities.find((e) => e.kind === 'equipment' && e.equipmentRole === 'type')) {
    if (type && (type.kind !== 'equipment' || type.equipmentRole !== 'type')) return;
    this.equipmentView = 'variants';
    const variant: Entity = {
      id: uid(),
      kind: 'equipment',
      equipmentRole: 'variant',
      parentId: type?.id ?? '',
      name: type ? 'New ' + type.name : 'New equipment',
      description: '',
      notes: '',
      known: true,
      properties: [],
    };
    this.story.entities.push(variant);
    this.entityId = variant.id;
    this.sceneSearch = '';
    this.changed();
  }
  openEquipmentType() {
    const id = this.entity?.parentId;
    if (!id) return;
    this.setEquipmentView('types');
    this.entityId = id;
  }
  private entityCategory(e: Entity): typeof this.tab {
    return e.kind === 'character' ? 'Characters' : e.kind === 'equipment' ? 'Equipment' : isKey(this.story, e) ? 'Keys' : 'Items';
  }
  get keyTargets() {
    if (!isKey(this.story, this.entity)) return [];
    const keyId = this.entity.id;
    const targets: { id: string; label: string; entityId: string; copyId: string }[] = [];
    for (const e of this.story.entities.filter((e) => e.kind === 'equipment')) {
      try {
        const template = resolveEquipment(this.story, e.id);
        if (template.lockable && template.keyItems?.includes(keyId)) targets.push({ id: e.id, label: e.name + (e.equipmentRole === 'type' ? ' (type)' : ''), entityId: e.id, copyId: '' });
      } catch {
        /* Invalid templates remain editable in Equipment. */
      }
    }
    for (const c of this.story.copies ?? []) {
      // Only explicit copy overrides need a separate destination from the template.
      if (!c.keyItems?.includes(keyId)) continue;
      const owner = this.story.entities.find((e) => e.id === c.owner && e.kind === 'character');
      const template = this.story.entities.find((e) => e.id === c.definition && e.kind === 'equipment');
      if (!owner && !template) continue;
      targets.push({ id: c.id, label: owner ? c.name + ' (' + owner.name + ')' : c.name + ' (template)', entityId: owner?.id ?? template.id, copyId: owner ? c.id : '' });
    }
    return targets;
  }
  openKeyTarget(target: { entityId: string; copyId: string }) {
    const entity = this.story.entities.find((e) => e.id === target.entityId);
    if (!entity) return;
    this.setTab(this.entityCategory(entity));
    if (entity.kind === 'equipment') this.equipmentView = entity.equipmentRole === 'type' ? 'types' : 'variants';
    this.entityId = entity.id;
    this.selectDetailSection(entity.kind === 'character' ? 'Equipment' : 'Locks');
    this.focusCopyId = target.copyId;
    if (target.copyId) setTimeout(() => document.getElementById('equipment-copy-' + target.copyId)?.scrollIntoView({ block: 'nearest' }));
  }
  get scenes() {
    return this.story?.scenes.filter((s) => s.title.toLowerCase().includes(this.sceneSearch.toLowerCase())) ?? [];
  }
  get storyNotes() {
    return this.folder?.collectChildren().filter((a) => !a.folder) ?? [];
  }
  get issues() {
    const key = this.story ? this.story.id + ':' + this.story.revision : '';
    if (key !== this.issueKey) {
      this.issueKey = key;
      this.cachedIssues = this.story ? validateStory(this.story) : [];
    }
    return this.cachedIssues;
  }
  get sceneIssues() {
    return this.issues.filter((i) => i.scene === this.sceneId);
  }
  get currentNote() {
    return this.notes.current;
  }
  openIssue(issue: Issue) {
    if (issue.flag) {
      this.setTab('Variables');
      this.flagId = issue.flag;
    } else if (issue.entity) {
      const entity = this.story.entities.find((e) => e.id === issue.entity);
      this.setTab(entity ? this.entityCategory(entity) : 'Items');
      if (entity?.kind === 'equipment') this.equipmentView = entity.equipmentRole === 'type' ? 'types' : 'variants';
      this.entityId = issue.entity;
      this.selectDetailSection(this.detailTabs.includes(issue.section) ? issue.section : this.detailTabs[0]);
      this.focusCopyId = issue.copy ?? '';
    } else if (issue.scene) {
      this.selectScene(issue.scene);
      this.passageId = issue.passage || this.passageId;
    }
  }
  deleteFlag(flag: FlagDefinition) {
    void this.deleteContent(flag.id, flag.name, () => {
      this.story.flags = this.story.flags.filter((f) => f.id !== flag.id);
      this.flagId = '';
    });
  }
  async createStory() {
    const previous = new Set(this.notes.getRoot().map((a) => a.id));
    await this.notes.create(null, true);
    const folder = this.notes.getRoot().find((a) => !previous.has(a.id));
    if (folder) this.open(folder);
  }
  open(folder: Article) {
    if (!folder?.folder || folder.parent || !this.notes.articles.includes(folder)) return;
    this.flagId = '';
    this.notes.storyFolder = folder;
    this.notes.current = this.storyNotes[0] ?? null;
    this.story = this.persistence.data.stories.find((s) => s.id === folder.id);
    if (!this.story) {
      this.story = newStory(folder.id);
      this.persistence.data.stories.push(this.story);
    }
    this.tab = 'Notes';
    this.sceneId = '';
    this.sceneView = 'map';
    this.entityId = '';
    this.passageId = '';
    this.testScene = '';
    this.sceneSearch = '';
    this.editedFingerprint = this.fingerprint();
  }
  home() {
    this.story = undefined;
    this.notes.storyFolder = null;
    this.notes.current = null;
    this.testScene = '';
  }
  setTab(tab: typeof this.tab) {
    this.focusCopyId = '';
    this.tab = tab;
    this.testScene = '';
    this.sceneSearch = '';
    this.entityId = tab === 'Characters' || tab === 'Items' || tab === 'Keys' || tab === 'Equipment' ? (this.entities[0]?.id ?? '') : '';
    if (tab === 'Notes') this.notes.current = this.storyNotes[0] ?? null;
    if (tab === 'Variables') this.flagId = this.story?.flags?.[0]?.id ?? '';
  }
  private fingerprint() {
    if (!this.story) return '';
    return playableFingerprint(this.story);
  }
  changed() {
    this.issueKey = '';
    const fingerprint = this.fingerprint();
    if (fingerprint !== this.editedFingerprint) {
      this.story.revision++;
      this.editedFingerprint = fingerprint;
      this.persistence.data.playthroughs.filter((g) => g.storyId === this.story.id && g.status === 'active').forEach((g) => (g.status = 'canceled'));
    }
    this.persistence.save();
  }
  showSceneMap() {
    this.sceneView = 'map';
    this.testScene = '';
  }
  showStorySettings() {
    this.sceneView = 'settings';
    this.testScene = '';
  }
  showSceneList() {
    this.sceneView = 'list';
    this.testScene = '';
  }
  selectScene(id: string) {
    this.sceneView = 'editor';
    this.sceneId = id;
    this.passageId = this.scene?.entry ?? '';
    this.choiceId = '';
    this.testScene = '';
  }
  selectConnection(event: { scene: string; passage: string; choice: string }) {
    this.selectScene(event.scene);
    this.passageId = event.passage;
    this.choiceId = event.choice;
    setTimeout(() => document.getElementById('choice-' + event.choice)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
  addScene() {
    const scene = newScene();
    this.story.scenes.push(scene);
    if (!this.story.start) this.story.start = scene.id;
    this.selectScene(scene.id);
    this.changed();
  }
  addPassage() {
    const p = newPassage();
    this.scene.passages.push(p);
    this.passageId = p.id;
    this.changed();
  }
  addChoice() {
    this.passage.choices.push(newChoice());
    this.changed();
  }
  moveChoice(index: number, direction: number) {
    const [choice] = this.passage.choices.splice(index, 1);
    this.passage.choices.splice(index + direction, 0, choice);
    this.changed();
  }
  async deleteContent(id: string, label: string, action: () => void, extraMessages: string[] = []) {
    const references = incomingReferences(this.story, id);
    if (
      await this.dialogs.createConfirmation({
        title: 'Delete ' + label,
        messages: ['Delete “' + label + '”?', ...extraMessages, ...(references.length ? ['Referenced by:', ...references, 'These references will need repair.'] : [])],
      })
    ) {
      action();
      this.changed();
    }
  }
  deleteScene() {
    const scene = this.scene;
    void this.deleteContent(scene.id, scene.title, () => {
      this.story.scenes = this.story.scenes.filter((s) => s.id !== scene.id);
      this.sceneId = '';
      this.showSceneMap();
      this.passageId = '';
    });
  }
  deletePassage(p: Passage) {
    void this.deleteContent(p.id, p.title, () => {
      this.scene.passages = this.scene.passages.filter((item) => item.id !== p.id);
      if (this.passageId === p.id) this.passageId = '';
    });
  }
  deleteChoice(id: string) {
    const choice = this.passage.choices.find((c) => c.id === id);
    void this.deleteContent(id, choice.label, () => (this.passage.choices = this.passage.choices.filter((c) => c.id !== id)));
  }
  duplicateScene() {
    const scene = copy(this.scene);
    const ids = [
      scene.id,
      ...scene.passages.flatMap((p) => [p.id, ...p.choices.flatMap((c) => [c.id, ...walkSteps(c.steps).flatMap((s) => [s.id, ...(s.kind === 'random' ? s.branches.map((b) => b.id) : [])])])]),
    ];
    let json = JSON.stringify(scene);
    for (const id of ids) json = json.split(id).join(uid());
    const duplicate: Scene = JSON.parse(json);
    duplicate.title += ' (copy)';
    this.story.scenes.push(duplicate);
    this.selectScene(duplicate.id);
    this.changed();
  }
  addEntity() {
    if (this.tab === 'Equipment' && this.equipmentView === 'variants') {
      this.createVariant();
      return;
    }
    const entity: Entity = {
      id: uid(),
      kind: this.selectedEntityKind,
      ...(this.tab === 'Keys' ? { key: true } : {}),
      ...(this.tab === 'Equipment' ? { equipmentRole: 'type' as const } : {}),
      name: 'New ' + this.selectedEntityLabel,
      ...(this.selectedEntityKind === 'equipment' ? { requiredSlots: [] } : {}),
      description: '',
      notes: '',
      known: true,
      properties: [],
      initialFlags: [],
      flagGrants: [],
      inventory: [],
    };
    this.story.entities.push(entity);
    this.entityId = entity.id;
    if (entity.kind === 'character' && !this.story.player) this.story.player = entity.id;
    this.changed();
  }
  duplicateEntity() {
    const e = copy(this.entity);
    if (isKey(this.story, this.entity)) e.key = true;
    e.id = uid();
    e.name += ' (copy)';
    e.inventory = [];
    const propertyIds = new Map<string, string>();
    e.properties.forEach((p) => {
      const id = uid();
      propertyIds.set(p.id, id);
      p.id = id;
    });
    for (const method of e.unlockMethods ?? []) {
      const remap = (value: any): void => {
        if (!value || typeof value !== 'object') return;
        if (typeof value.target === 'string') {
          const ref = parseVariableKey(value.target);
          if (ref?.owner === '@equipment' && propertyIds.has(ref.variable)) value.target = variableKey(ref.scope, ref.owner, propertyIds.get(ref.variable));
        }
        Object.values(value).forEach(remap);
      };
      remap(method);
    }
    this.story.entities.push(e);
    this.entityId = e.id;
    this.changed();
  }
  moveEntity(id: string, offset: number) {
    if (this.sceneSearch) return;
    const source = this.story.entities.find((e) => e.id === id);
    if (!source) return;
    const category = this.entityCategory(source);
    const matches = (e: Entity) => this.entityCategory(e) === category && (e.equipmentRole === 'type') === (source.equipmentRole === 'type');
    const sameKind = this.story.entities.filter(matches);
    const index = sameKind.findIndex((e) => e.id === id);
    if (!moveEntry(sameKind, index, offset)) return;
    let cursor = 0;
    this.story.entities = this.story.entities.map((e) => (matches(e) ? sameKind[cursor++] : e));
    this.changed();
  }
  deleteEntity() {
    const e = this.entity;
    const copies = (this.story.copies ?? []).filter((c) => c.definition === e.id);
    const copyReferences = copies.flatMap((c) => incomingReferences(this.story, c.id));
    void this.deleteContent(
      e.id,
      e.name,
      () => {
        this.story.entities = this.story.entities.filter((item) => item.id !== e.id);
        this.story.copies = (this.story.copies ?? []).filter((c) => c.definition !== e.id);
        this.entityId = '';
      },
      copies.length ? ['Also deletes ' + copies.length + ' equipment copies.', ...copyReferences.map((r) => 'Copy used by: ' + r)] : [],
    );
  }
  deleteProperty(properties: Property[], property: Property) {
    void this.deleteContent(property.id, property.name, () => properties.splice(properties.indexOf(property), 1));
  }
  setRequiredSlot(entity: Entity, slot: string, selected: boolean) {
    if (entity.kind !== 'equipment') return;
    entity.requiredSlots = selected ? [...new Set([...(entity.requiredSlots ?? []), slot])] : (entity.requiredSlots ?? []).filter((s) => s !== slot);
    this.changed();
  }
  missingEquipmentSlots(entity: Entity) {
    return (entity.requiredSlots ?? []).filter((slot) => !this.story.slots.includes(slot));
  }
  setSlots(value: string) {
    this.story.slots = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.changed();
  }
  linkNote(id: string, linked: boolean) {
    this.scene.noteIds = linked ? [...this.scene.noteIds, id] : this.scene.noteIds.filter((n) => n !== id);
    this.changed();
  }
  copyNote(id: string) {
    const note = this.storyNotes.find((n) => n.id === id);
    if (note && this.passage) {
      this.passage.text += (this.passage.text ? '\n\n' : '') + note.text;
      this.changed();
    }
  }
  openNote(note: Article) {
    this.notes.current = note;
    this.tab = 'Notes';
  }
  openNoteLinks() {
    const links = [...new Set(this.currentNote?.text.match(/\b(?:https?:\/\/|www\.)[^\s<>()]+/gi) ?? [])];
    links.reverse().forEach((link) => {
      const trimmed = link.replace(/[.,!?;:)\]}]+$/g, '');
      window.open(/^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed, '_blank', 'noopener');
    });
  }
  async deleteStory(folder: Article) {
    if (
      !(await this.dialogs.createConfirmation({
        title: 'Delete story',
        messages: ['Delete “' + folder.title + '”, including all its notes, scenes, characters, items, equipment, and playthroughs?'],
      }))
    )
      return;
    const ids = new Set([folder.id, ...folder.collectChildren().map((a) => a.id)]);
    this.notes.articles = this.notes.articles.filter((a) => !ids.has(a.id));
    this.persistence.data.stories = this.persistence.data.stories.filter((s) => s.id !== folder.id);
    this.persistence.data.playthroughs = this.persistence.data.playthroughs.filter((g) => g.storyId !== folder.id);
    if (this.folder === folder) this.home();
    this.persistence.save(true);
  }
}
