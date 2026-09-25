import { MultiselectComponent } from '../../../shared/components/multiselect/multiselect.component';
import { unlockMethods, unlockRandomKey } from '../../engine/story-locks';
import { allProperties, variableScope, variableType, variableKey, parseVariableKey } from '../../models/story.model';
import { inventoryRows, quantity, changeQuantity } from '../../engine/story-inventory';
import { AfterViewChecked, Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../shared/services/dialog.service';
import { isItem, mutableProperties, referenceEntities, Choice, copy, Entity, GameState, Playthrough, Story, Transcript, walkSteps } from '../../models/story.model';
import { applyEffect, choose, choiceAvailable, initialState, startGame, readVariable, writeVariable, changePlayerEquipment, attemptPlayerUnlock, unlockAttemptReason } from '../../engine/story-engine';
import { validateStory } from '../../engine/story-validation';
import { flagStatuses, validateFlags } from '../../engine/story-flags';
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
  gearView: 'inventory' | 'equipment' = 'inventory';
  inspected = '';
  undoStack: Playthrough[] = [];
  forced: Record<string, number> = {};
  forcedUnlock: Record<string, string> = {};
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
  get currentTranscript() {
    return [...(this.game?.transcript ?? [])].reverse().find((entry) => !entry.kind || entry.kind === 'passage');
  }
  get lastAttempt() {
    return [...(this.game?.transcript ?? [])].reverse().find((entry) => entry.kind === 'equipmentAttempt');
  }
  transcriptSpeaker(entry: Transcript) {
    if (entry.kind !== 'equipmentAttempt') return entry.speaker || 'Narration';
    if (entry.attempt?.actor === this.story.player) return 'You';
    return entry.action ? entry.speaker : entry.speaker.split(' - ')[0];
  }
  transcriptAction(entry: Transcript) {
    if (entry.action) return entry.action;
    // Older unlock entries stored the actor, method, and item together in the heading.
    return entry.kind === 'equipmentAttempt' ? entry.speaker.split(' - ').slice(1).join(': ') : '';
  }
  methods(id: string) {
    return unlockMethods(this.story, id);
  }
  get methodTests() {
    return this.copies.flatMap((c) => this.methods(c.id).map((method) => ({ target: c.id, method, key: unlockRandomKey(c.id, method.id), label: c.name + ' - ' + method.label })));
  }
  isLocked(id: string) {
    return this.game?.state.copyStates?.[id]?.locked ?? false;
  }
  unlockReason(id: string, method: string) {
    return unlockAttemptReason(this.story, this.game.state, id, method, this.story.player);
  }
  private forceResult = (target: string, method: string) => {
    const value = this.testScene ? this.forcedUnlock[unlockRandomKey(target, method)] : '';
    return value === 'success' ? true : value === 'failure' ? false : undefined;
  };
  private randomDraw = (stepId: string) => {
    const index = this.forced[stepId],
      step = this.randomSteps.find((r) => r.step.id === stepId)?.step;
    if (!this.testScene || index === undefined || index < 0 || !step?.branches[index]) return Math.random();
    return (step.branches.slice(0, index).reduce((n, b) => n + b.percent, 0) + step.branches[index].percent / 2) / 100;
  };
  async unlock(id: string, method: string) {
    if (this.busy || !this.canChangeEquipment) return;
    this.busy = true;
    this.error = '';
    try {
      const original = this.game,
        next = attemptPlayerUnlock(this.story, original, id, method, this.randomDraw, this.forceResult);
      await this.advance(original, next);
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }
  setSetupLocked(id: string, enabled: boolean) {
    try {
      applyEffect(this.story, this.setup, { kind: enabled ? 'lockEquipment' : 'unlockEquipment', target: id, actor: this.setup.copyStates[id].owner, value: '', ignoreLayering: true });
      this.error = '';
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
  setSetupCondition(id: string, condition: 'intact' | 'broken' | 'destroyed') {
    if (!['intact', 'broken', 'destroyed'].includes(condition)) return;
    const instance = this.setup.copyStates[id];
    if (condition !== 'intact') {
      for (const slot of Object.keys(this.setup.equipment[instance.owner] ?? {})) if (this.setup.equipment[instance.owner][slot] === id) delete this.setup.equipment[instance.owner][slot];
      instance.locked = false;
    }
    if (condition === 'destroyed') instance.owner = '';
    instance.condition = condition;
  }
  get passage() {
    return this.story.scenes.find((s) => s.id === this.game?.scene)?.passages.find((p) => p.id === this.game.passage);
  }
  get choices() {
    return this.passage?.choices.filter((c) => (c.repeatable === true || !this.game.state.chosen.includes(c.id)) && (c.unavailable !== 'hidden' || this.available(c))) ?? [];
  }
  get characters() {
    return this.story.entities.filter((e) => e.kind === 'character');
  }
  get properties() {
    return mutableProperties(this.story);
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
  get copies() {
    return this.story.copies ?? [];
  }
  setCopyOwner(id: string, owner: string) {
    const current = this.setup.copyStates?.[id]?.owner;
    if (current === owner) return;
    try {
      applyEffect(this.story, this.setup, { kind: !owner ? 'removeEquipment' : !current ? 'giveEquipment' : 'transferEquipment', target: id, actor: owner || current, from: current, value: '' });
      this.error = '';
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
  visibleVariables(actor: string) {
    return allProperties(this.story).filter((p) => {
      const ref = parseVariableKey(p.property.id);
      return ref && ref.scope === (actor ? 'character' : 'story') && ref.owner === actor && p.property.known && (p.property.type !== 'boolean' || this.read(p.property.id, this.game.state) === true);
    });
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
    const options = [
      ...this.allEntities.map((e) => ({ value: e.id, label: e.name + ' (' + (e.kind === 'object' ? 'item' : e.kind) + ')' })),
      ...allProperties(this.story).map((p) => ({ value: p.property.id, label: p.label })),
    ];
    return [...options, ...(this.setup?.known ?? []).filter((id) => !options.some((option) => option.value === id)).map((id) => ({ value: id, label: 'Missing reference: ' + id, disabled: true }))];
  }
  get randomSteps() {
    const dialogue = this.story.scenes.flatMap((s) =>
      s.passages.flatMap((p) =>
        p.choices.flatMap((c) =>
          walkSteps(c.steps)
            .filter((step) => step.kind === 'random')
            .map((step) => ({ step, label: s.title + ' / ' + c.label })),
        ),
      ),
    );
    const methods = this.methodTests.flatMap(({ target, method, label }) =>
      walkSteps([...method.costs, ...method.yes, ...method.no])
        .filter((step) => step.kind === 'random')
        .map((step) => ({ step: { ...step, id: unlockRandomKey(target, method.id, step.id) }, label })),
    );
    return [...dialogue, ...methods];
  }
  get inventory() {
    return inventoryRows(this.story, this.game.state, this.story.player);
  }
  get equipment() {
    return inventoryRows(this.story, this.game.state, this.story.player, true);
  }
  get canChangeEquipment() {
    return this.game?.status === 'active' && this.game.revision === this.story.revision;
  }
  equipmentReason(id: string, equipped: boolean | 'lock') {
    if (!this.canChangeEquipment) return 'This playthrough is no longer active.';
    try {
      if (equipped === 'lock') changePlayerEquipment(this.story, this.game, id, 'lock');
      else applyEffect(this.story, copy(this.game.state), { kind: equipped ? 'equip' : 'unequip', target: id, actor: this.story.player, value: '' });
      return '';
    } catch (e) {
      return (e as Error).message;
    }
  }
  async changeEquipment(id: string, equipped: boolean | 'lock') {
    if (this.busy || !this.canChangeEquipment) return;
    this.busy = true;
    this.error = '';
    try {
      const original = this.game;
      const next = changePlayerEquipment(this.story, original, id, equipped);
      await this.advance(original, next);
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }
  get items() {
    return this.story.entities.filter((e) => e.kind === 'object');
  }
  get allEntities() {
    return referenceEntities(this.story);
  }
  amount(actor: string, id: string) {
    return quantity(this.setup, actor, id);
  }
  setAmount(actor: string, id: string, count: number) {
    try {
      if (!this.characters.some((e) => e.id === actor) || !this.items.some((e) => e.id === id)) throw new Error('Choose an Item and character.');
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Quantity must be a nonnegative integer.');
      changeQuantity(this.setup, actor, id, count - quantity(this.setup, actor, id));
      this.error = '';
    } catch (e) {
      this.error = String(e);
    }
  }
  itemEquipped(actor: string, id: string) {
    return Object.values(this.setup.equipment[actor] ?? {}).includes(id);
  }
  equipItem(actor: string, id: string, enabled: boolean) {
    try {
      applyEffect(this.story, this.setup, { kind: enabled ? 'equip' : 'unequip', target: id, actor, value: '' });
      this.error = '';
    } catch (e) {
      this.error = String(e);
    }
  }
  get inspectedEntity() {
    return referenceEntities(this.story).find((e) => e.id === this.inspected);
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
  known(id: string) {
    return this.game?.state.known.includes(id);
  }
  get standardFlags() {
    return (this.story.flags ?? []).filter((f) => variableType(f) === 'boolean' && variableScope(f) === 'character');
  }
  get flagErrors() {
    return validateFlags(this.story);
  }
  setDirectFlag(actor: string, flag: string, enabled: boolean) {
    applyEffect(this.story, this.setup, { kind: enabled ? 'addFlag' : 'removeFlag', actor, target: flag, value: '' });
  }
  statuses(actor: string, state: GameState) {
    // Draft rule errors are displayed separately rather than breaking Angular rendering.
    try {
      return flagStatuses(this.story, state, actor);
    } catch {
      return [];
    }
  }
  visibleFlags(actor: string) {
    return this.statuses(actor, this.game.state).filter((status) => status.active && status.flag.visible);
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
      this.inspected = '';
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
      const next = choose(this.story, original, id, this.randomDraw, this.forceResult);
      await this.advance(original, next);
      this.inspected = '';
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
      this.inspected = '';
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
      this.inspected = '';
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
