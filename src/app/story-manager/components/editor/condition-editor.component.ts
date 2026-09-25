import { variableScope, variableType } from '../../models/story.model';
import { itemTargets } from '../../engine/story-inventory';
import { ReorderComponent } from './reorder.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isItem, allProperties, referenceEntities, always, Condition, Story } from '../../models/story.model';
import { ValueEditorComponent } from './value-editor.component';

@Component({ selector: 'story-condition', imports: [ReorderComponent, FormsModule, ValueEditorComponent], templateUrl: './condition-editor.component.html', styleUrls: ['./editor.scss'] })
export class ConditionEditorComponent {
  @Input({ required: true }) story: Story;
  @Input({ required: true }) condition: Condition;
  @Output() changed = new EventEmitter<void>();
  scope = variableScope;
  get booleanVariables() {
    return (this.story.flags ?? []).filter((v) => variableType(v) === 'boolean');
  }
  get flagNeedsCharacter() {
    const v = this.story.flags?.find((v) => v.id === this.condition.target);
    return v && variableScope(v) === 'character';
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
    return itemTargets(this.story).filter((e) => this.condition.kind !== 'wears' || e.kind === 'equipment');
  }
  get allEntities() {
    return referenceEntities(this.story);
  }
  get items() {
    return this.story.entities.filter((e) => e.kind === 'object');
  }
  get choices() {
    return this.story.scenes.flatMap((s) => s.passages.flatMap((p) => p.choices.map((c) => ({ id: c.id, label: s.title + ' / ' + p.title + ' / ' + c.label }))));
  }
  get type() {
    if (this.condition.kind === 'quantity') return 'number';
    return this.properties.find((p) => p.property.id === this.condition.target)?.property.type ?? 'text';
  }
  kindChanged() {
    this.condition.children = this.condition.kind === 'not' ? [always()] : [];
    this.condition.target = '';
    if (this.condition.kind === 'quantity') this.condition.value = 1;
    this.changed.emit();
  }
  targetChanged() {
    this.condition.value = this.type === 'boolean' ? false : this.type === 'number' ? 0 : '';
    this.changed.emit();
  }
  add() {
    this.condition.children.push(always());
    this.changed.emit();
  }
  remove(index: number) {
    this.condition.children.splice(index, 1);
    this.changed.emit();
  }
}
