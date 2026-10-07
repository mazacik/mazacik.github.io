import { ReorderComponent } from './reorder.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { allProperties, always, Effect, newPassage, newScene, Step, Story, uid } from '../../models/story.model';
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
  @Output() changed = new EventEmitter<void>();
  get properties() {
    return allProperties(this.story);
  }
  get standardFlags() {
    return this.story.flags.filter((v) => v.type === 'boolean');
  }
  type(effect: Effect) {
    return this.properties.find((p) => p.property.id === effect.target)?.property.type ?? 'text';
  }
  targetChanged(effect: Effect) {
    effect.value = this.type(effect) === 'boolean' ? false : this.type(effect) === 'number' ? 0 : '';
    this.changed.emit();
  }
  changeAction(index: number, kind: Effect['kind']) {
    const step = this.steps[index];
    if (step.kind !== 'effect') return;
    step.effect = { kind, target: '', value: '' };
    this.changed.emit();
  }
  add(kind: Step['kind']) {
    const id = uid();
    const step: Step =
      kind === 'condition'
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
            ? { id, kind, effect: { kind: 'set', target: '', value: '' } }
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
