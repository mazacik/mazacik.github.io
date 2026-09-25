import { variableScope, variableType, variableDefault, Value } from '../../models/story.model';
import { ValueEditorComponent } from './value-editor.component';
import { MultiselectComponent } from '../../../shared/components/multiselect/multiselect.component';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Entity, Story } from '../../models/story.model';

@Component({
  selector: 'story-entity-flags',
  imports: [ValueEditorComponent, MultiselectComponent, FormsModule],
  styleUrls: ['./editor.scss'],
  template: `
    @if (entity.kind === 'character') {
      <h3>Starting variables</h3>
      @for (v of characterVariables; track v.id) {
        <div class="field-row">
          <label>{{ v.name }}<story-value [type]="type(v)" [value]="entity.variableValues?.[v.id] ?? initial(v)" (valueChange)="setValue(v.id, $event)" /></label>
          <div class="entry-actions">
            @if (hasOverride(v.id)) {
              <button (click)="resetValue(v.id)">Reset to default</button>
            } @else {
              <span class="muted">Default value</span>
            }
          </div>
        </div>
      }
      @for (id of invalidValues; track id) {
        <p class="danger">Invalid starting variable: {{ id }} <button (click)="resetValue(id)">Remove override</button></p>
      }
    } @else {
      <h3>Effects</h3>
      <app-multiselect label="Effects" placeholder="Select effects..." [options]="effectOptions" [value]="selectedEffects" (valueChange)="setEffects($event)" />
      @if (!standardFlags.length) {
        <p class="muted">Create Character Boolean variables in Variables first.</p>
      }
    }
  `,
})
export class EntityFlagsComponent {
  @Input({ required: true }) story: Story;
  @Input({ required: true }) entity: Entity;
  @Output() changed = new EventEmitter<void>();
  type = variableType;
  initial = variableDefault;
  get characterVariables() {
    return (this.story.flags ?? []).filter((v) => variableScope(v) === 'character');
  }
  get invalidValues() {
    return Object.keys(this.entity.variableValues ?? {}).filter((id) => !this.characterVariables.some((v) => v.id === id));
  }
  hasOverride(id: string) {
    return Object.hasOwn(this.entity.variableValues ?? {}, id);
  }
  setValue(id: string, value: Value) {
    (this.entity.variableValues ??= {})[id] = value;
    this.changed.emit();
  }
  resetValue(id: string) {
    delete this.entity.variableValues[id];
    this.changed.emit();
  }
  get standardFlags() {
    return (this.story.flags ?? []).filter((f) => variableType(f) === 'boolean' && variableScope(f) === 'character');
  }
  get selectedEffects() {
    return [...new Set((this.entity.flagGrants ?? []).filter((g) => !g.suppressed).map((g) => g.flag))];
  }
  get effectOptions() {
    return [
      ...this.standardFlags.map((v) => ({ value: v.id, label: v.name })),
      ...this.selectedEffects.filter((id) => !this.standardFlags.some((v) => v.id === id)).map((id) => ({ value: id, label: 'Missing or incompatible effect: ' + id, disabled: true })),
    ];
  }
  setEffects(ids: string[]) {
    const selected = [...new Set(ids.filter((id) => this.selectedEffects.includes(id) || this.standardFlags.some((v) => v.id === id)))];
    this.entity.flagGrants = selected.map((flag) => this.entity.flagGrants?.find((g) => g.flag === flag && !g.suppressed) ?? { flag, when: this.entity.kind === 'equipment' ? 'equipped' : 'owned' });
    this.changed.emit();
  }
}
