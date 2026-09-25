import { unlockMethods, lockEffects } from '../../engine/story-locks';
import { variableScope, variableType } from '../../models/story.model';
import { itemTargets } from '../../engine/story-inventory';
import { ReorderComponent } from './reorder.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isItem, allProperties, mutableProperties, referenceEntities, always, Effect, newPassage, newScene, Step, Story, uid } from '../../models/story.model';
import { ConditionEditorComponent } from './condition-editor.component';
import { ValueEditorComponent } from './value-editor.component';

@Component({
  selector: 'story-outcomes',
  imports: [ReorderComponent, FormsModule, ConditionEditorComponent, ValueEditorComponent],
  templateUrl: './outcome-editor.component.html',
  styleUrls: ['./editor.scss'],
})
export class OutcomeEditorComponent {
  @Input({ required: true }) story: Story;
  @Input({ required: true }) steps: Step[];
  @Input() allowUnlock = true;
  @Input() allowNavigation = true;
  @Output() changed = new EventEmitter<void>();
  methods(id: string) {
    return unlockMethods(this.story, id);
  }
  get properties() {
    return allProperties(this.story);
  }
  get characters() {
    return this.story.entities.filter((e) => e.kind === 'character');
  }
  itemLabel(e: { id: string; name: string }) {
    return e.name;
  }
  get objects() {
    return itemTargets(this.story);
  }
  get allEntities() {
    return referenceEntities(this.story);
  }
  get items() {
    return this.story.entities.filter((e) => e.kind === 'object');
  }
  effectObjects(effect: Effect) {
    return effect.kind.endsWith('Quantity') ? this.items : this.objects.filter((e) => e.kind === 'equipment');
  }
  effectProperties(effect: Effect) {
    return effect.kind === 'reveal' ? this.properties : mutableProperties(this.story);
  }
  get standardFlags() {
    return (this.story.flags ?? []).filter((f) => variableType(f) === 'boolean');
  }
  needsCharacter(effect: Effect) {
    const v = this.story.flags?.find((v) => v.id === effect.target);
    return (
      ['equip', 'unequip', 'giveEquipment', 'removeEquipment', 'transferEquipment', ...lockEffects].includes(effect.kind) ||
      effect.kind.endsWith('Quantity') ||
      (['addFlag', 'removeFlag'].includes(effect.kind) && v && variableScope(v) === 'character')
    );
  }
  type(effect: Effect) {
    return this.properties.find((p) => p.property.id === effect.target)?.property.type ?? 'text';
  }
  targetChanged(effect: Effect) {
    if (effect.kind.endsWith('Quantity')) {
      effect.value = 1;
      this.changed.emit();
      return;
    }
    effect.value = this.type(effect) === 'boolean' ? false : this.type(effect) === 'number' ? 0 : '';
    this.changed.emit();
  }
  changeAction(index: number, kind: Effect['kind'] | 'unlockAttempt') {
    const step = this.steps[index];
    if (step.kind !== 'effect' && step.kind !== 'unlock') return;
    if (kind === 'unlockAttempt') {
      if (!this.allowUnlock || step.kind === 'unlock') return;
      this.steps[index] = { id: step.id, kind: 'unlock', target: '', actor: '', method: '' };
    } else if (step.kind === 'effect') {
      step.effect.kind = kind;
      step.effect.target = '';
      step.effect.ignoreLayering = false;
    } else {
      this.steps[index] = { id: step.id, kind: 'effect', effect: { kind, target: '', actor: '', value: '' } };
    }
    this.changed.emit();
  }
  add(kind: Step['kind']) {
    if ((!this.allowUnlock && kind === 'unlock') || (!this.allowNavigation && (kind === 'go' || kind === 'end'))) return;
    const id = uid();
    const step: Step =
      kind === 'unlock'
        ? { id, kind, target: '', actor: '', method: '' }
        : kind === 'condition'
          ? { id, kind, condition: always(), yes: [], no: [] }
          : kind === 'random'
            ? {
                id,
                kind,
                branches: [
                  { id: uid(), percent: 50, steps: [] },
                  { id: uid(), percent: 50, steps: [] },
                ],
              }
            : kind === 'effect'
              ? { id, kind, effect: { kind: 'set', target: '', actor: '', value: '' } }
              : kind === 'go'
                ? { id, kind, scene: '', passage: '' }
                : { id, kind };
    this.steps.push(step);
    this.changed.emit();
  }
  remove(index: number) {
    this.steps.splice(index, 1);
    this.changed.emit();
  }
  move(index: number, offset: number) {
    const [step] = this.steps.splice(index, 1);
    this.steps.splice(index + offset, 0, step);
    this.changed.emit();
  }
  addBranch(step: Extract<Step, { kind: 'random' }>) {
    step.branches.push({ id: uid(), percent: 0, steps: [] });
    this.changed.emit();
  }
  removeBranch(step: Extract<Step, { kind: 'random' }>, index: number) {
    step.branches.splice(index, 1);
    this.changed.emit();
  }
  passages(id: string) {
    return this.story.scenes.find((s) => s.id === id)?.passages ?? [];
  }
  createScene(step: Extract<Step, { kind: 'go' }>) {
    const scene = newScene();
    this.story.scenes.push(scene);
    step.scene = scene.id;
    step.passage = '';
    this.changed.emit();
  }
  createPassage(step: Extract<Step, { kind: 'go' }>) {
    const scene = this.story.scenes.find((s) => s.id === step.scene);
    if (scene) {
      const p = newPassage();
      scene.passages.push(p);
      step.passage = p.id;
      this.changed.emit();
    }
  }
}
