import { MultiselectComponent } from '../../../shared/components/multiselect/multiselect.component';
import { AfterViewChecked, Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../shared/services/dialog.service';
import { allProperties, Choice, copy, GameState, Playthrough, Story, walkSteps } from '../../models/story.model';
import { choose, choiceAvailable, initialState, startGame, readVariable, writeVariable } from '../../engine/story-engine';
import { validateStory } from '../../engine/story-validation';
import { validateFlags } from '../../engine/story-flags';
import { StoryManagerSerializationService } from '../../services/story-manager-serialization.service';
import { ValueEditorComponent } from './value-editor.component';

@Component({
  selector: 'story-player',
  imports: [FormsModule, ValueEditorComponent, MultiselectComponent],
  templateUrl: './player.component.html',
  styleUrls: ['./editor.scss', './player.component.scss'],
})
export class PlayerComponent implements OnChanges, AfterViewChecked {
  @Input() story: Story;
  @Input() revision = 0;
  @Input() testScene = '';
  @ViewChild('historyScroll') private historyScroll?: ElementRef<HTMLElement>;
  @ViewChild('transcriptContent') private transcriptContent?: ElementRef<HTMLElement>;
  private renderedTranscript?: Playthrough['transcript'];
  testGame: Playthrough;
  setup: GameState;
  error = '';
  busy = false;
  undoStack: Playthrough[] = [];
  forced: Record<string, number> = {};
  constructor(
    public persistence: StoryManagerSerializationService,
    private dialogs: DialogService,
  ) {}
  ngOnChanges() {
    this.undoStack = [];
    if (this.testScene) {
      try {
        this.setup = initialState(this.story);
        this.testGame = undefined;
        this.undoStack = [];
      } catch (e) {
        this.error = String(e);
      }
    }
  }
  ngAfterViewChecked() {
    const transcript = this.game?.transcript;
    if (transcript === this.renderedTranscript) return;
    this.renderedTranscript = transcript;
    const history = this.historyScroll?.nativeElement,
      content = this.transcriptContent?.nativeElement;
    if (!history || !content) return;
    // Scroll only the history pane, leaving the choices and surrounding page in place.
    history.scrollTop += content.getBoundingClientRect().bottom - history.getBoundingClientRect().bottom;
  }
  get game() {
    if (this.testScene) return this.testGame;
    // Older documents may contain multiple saves. Resume the newest one without
    // exposing save slots or deleting previous progress merely by opening Play.
    return this.persistence.data.playthroughs.filter((g) => g.storyId === this.story.id).sort((a, b) => b.created.localeCompare(a.created))[0];
  }
  private randomDraw = (stepId: string) => {
    const index = this.forced[stepId],
      step = this.randomSteps.find((r) => r.step.id === stepId)?.step;
    if (!this.testScene || index === undefined || index < 0 || !step?.branches[index]) return Math.random();
    return (step.branches.slice(0, index).reduce((n, b) => n + b.percent, 0) + step.branches[index].percent / 2) / 100;
  };
  get passage() {
    return this.story.scenes.find((s) => s.id === this.game?.scene)?.passages.find((p) => p.id === this.game.passage);
  }
  get choices() {
    return this.passage?.choices.filter((c) => (c.repeatable === true || !this.game.state.chosen.includes(c.id)) && (c.unavailable !== 'hidden' || this.available(c))) ?? [];
  }
  get properties() {
    return allProperties(this.story);
  }
  read(key: string, state: GameState) {
    try {
      return readVariable(this.story, state, key);
    } catch {
      return '';
    }
  }
  setVariable(key: string, value: import('../../models/story.model').Value) {
    try {
      writeVariable(this.story, this.setup, key, value);
      this.error = '';
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
  get visibleVariables() {
    return this.properties.filter((p) => this.game.state.known.includes(p.property.id));
  }
  get authoredChoices() {
    return this.story.scenes.flatMap((s) => s.passages.flatMap((p) => p.choices.map((c) => ({ id: c.id, label: s.title + ' / ' + c.label }))));
  }
  get choiceOptions() {
    return this.authoredChoices.map((c) => ({ value: c.id, label: c.label }));
  }
  setChosen(ids: string[]) {
    this.setup.chosen = [...new Set(ids.filter((id) => this.choiceOptions.some((option) => option.value === id)))];
  }
  get knownOptions() {
    return this.properties.map((p) => ({ value: p.property.id, label: p.label }));
  }
  get randomSteps() {
    return this.story.scenes.flatMap((s) =>
      s.passages.flatMap((p) =>
        p.choices.flatMap((c) =>
          walkSteps(c.steps)
            .filter((step) => step.kind === 'random')
            .map((step) => ({ step, label: s.title + ' / ' + c.label })),
        ),
      ),
    );
  }
  allowed(id: string) {
    return this.available(this.passage.choices.find((c) => c.id === id));
  }
  private available(choice: Choice) {
    try {
      return choiceAvailable(this.story, this.game.state, choice);
    } catch {
      return false;
    }
  }
  get testIssues() {
    return this.testScene && this.game ? validateStory(this.story).filter((i) => i.scene === this.game.scene) : [];
  }
  get flagErrors() {
    return validateFlags(this.story);
  }
  async start(): Promise<void> {
    if (this.busy) return;
    if (!this.testScene && this.game) return this.restart();
    this.error = '';
    const issues = validateStory(this.story);
    if (this.flagErrors.length) {
      this.error = this.flagErrors.map((i) => i.message).join(' ');
      return;
    }
    if (!this.testScene && issues.length) {
      this.error = 'Fix story validation errors before starting a game.';
      return;
    }
    const name = this.testScene ? 'Scene test' : 'Playthrough';
    this.busy = true;
    try {
      const game = startGame(this.story, name, this.testScene || this.story.start, this.testScene ? this.setup : initialState(this.story));
      if (this.testScene) {
        this.testGame = game;
      } else {
        await this.persistence.commit(game);
      }
      this.undoStack = [];
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = false;
    }
  }
  async select(id: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      const original = this.game;
      const next = choose(this.story, original, id, this.randomDraw);
      await this.advance(original, next);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = false;
    }
  }
  private async advance(original: Playthrough, next: Playthrough) {
    if (this.testScene) this.testGame = next;
    else await this.persistence.commit(next);
    this.undoStack.push(copy(original));
  }
  get canUndo() {
    const previous = this.undoStack.at(-1),
      current = this.game;
    return !!previous && !!current && previous.id === current.id && previous.revision === current.revision && current.revision === this.story.revision && current.status !== 'canceled';
  }
  async undo(): Promise<void> {
    if (this.busy || !this.canUndo) return;
    this.busy = true;
    this.error = '';
    try {
      const previous = this.undoStack.at(-1);
      if (this.testScene) this.testGame = copy(previous);
      else await this.persistence.commit(copy(previous));
      this.undoStack.pop();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = false;
    }
  }
  async restart(): Promise<void> {
    const current = this.game;
    if (this.busy || !current || this.testScene) return;
    this.busy = true;
    this.error = '';
    try {
      if (!(await this.dialogs.createConfirmation({ title: 'Restart', messages: ['Restart from the beginning? Your current progress and dialogue history will be replaced.'] }))) return;
      if (validateStory(this.story).length) {
        this.error = 'Fix story validation errors before restarting.';
        return;
      }
      const game = startGame(this.story, current.name);
      game.id = current.id;
      await this.persistence.commit(game);
      this.undoStack = [];
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = false;
    }
  }
  setKnown(ids: string[]) {
    this.setup.known = [...new Set(ids.filter((id) => this.knownOptions.some((option) => option.value === id)))];
  }
}
