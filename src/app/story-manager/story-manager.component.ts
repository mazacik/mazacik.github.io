import { ReorderComponent } from './components/editor/reorder.component';
import { AutosizeTextareaDirective } from '../shared/directives/autosize-textarea.directive';
import { playableFingerprint } from './engine/story-order';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationSettingsComponent } from '../shared/dialogs/application-settings/application-settings.component';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { StoryManagerStateService } from './services/story-manager-state.service';
import { StoryManagerSerializationService } from './services/story-manager-serialization.service';
import { Article } from './models/article.class';
import { copy, FlagDefinition, Issue, newChoice, newPassage, newScene, newStory, Passage, Scene, Story, uid, walkSteps } from './models/story.model';
import { incomingReferences, validateStory } from './engine/story-validation';
import { SceneMapComponent } from './components/editor/scene-map.component';
import { TextEditorComponent } from './components/editor/text-editor.component';
import { ConditionEditorComponent } from './components/editor/condition-editor.component';
import { OutcomeEditorComponent } from './components/editor/outcome-editor.component';
import { PlayerComponent } from './components/editor/player.component';
import { FlagsEditorComponent } from './components/editor/flags-editor.component';

@Component({
  selector: 'app-story-manager',
  imports: [
    FormsModule,
    ReorderComponent,
    AutosizeTextareaDirective,
    SidebarComponent,
    SceneMapComponent,
    TextEditorComponent,
    ConditionEditorComponent,
    OutcomeEditorComponent,
    PlayerComponent,
    FlagsEditorComponent,
  ],
  templateUrl: './story-manager.component.html',
  styleUrls: ['./components/editor/editor.scss', './components/editor/panels.scss', './story-manager.component.scss'],
})
export class StoryManagerComponent implements OnInit, OnDestroy {
  story: Story;
  tab: 'Notes' | 'Variables' | 'Scenes' | 'Play' = 'Notes';
  readonly tabs = ['Notes', 'Variables', 'Scenes', 'Play'] as const;
  flagId = '';
  sceneId = '';
  passageId = '';
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
      { label: 'variables', count: story?.flags?.length ?? 0 },
    ];
  }
  get scene() {
    return this.story?.scenes.find((s) => s.id === this.sceneId);
  }
  get passage() {
    return this.scene?.passages.find((p) => p.id === this.passageId);
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
    } else if (issue.scene) {
      this.setTab('Scenes');
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
    this.tab = tab;
    this.testScene = '';
    this.sceneSearch = '';
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
        messages: ['Delete “' + folder.title + '”, including all its notes, variables, scenes, and playthroughs?'],
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
