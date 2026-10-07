import { ReorderComponent } from './reorder.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { allProperties, always, Condition, Story } from '../../models/story.model';
import { ValueEditorComponent } from './value-editor.component';
@Component({ selector: 'story-condition', imports: [ReorderComponent, FormsModule, ValueEditorComponent], templateUrl: './condition-editor.component.html', styleUrls: ['./editor.scss'] })
export class ConditionEditorComponent {
  @Input({ required: true }) story: Story;
  @Input({ required: true }) condition: Condition;
  @Output() changed = new EventEmitter<void>();
  get booleanVariables() {
    return this.story.flags.filter((v) => v.type === 'boolean');
  }
  get properties() {
    return allProperties(this.story);
  }
  get choices() {
    return this.story.scenes.flatMap((s) => s.passages.flatMap((p) => p.choices.map((c) => ({ id: c.id, label: s.title + ' / ' + p.title + ' / ' + c.label }))));
  }
  get type() {
    return this.properties.find((p) => p.property.id === this.condition.target)?.property.type ?? 'text';
  }
  kindChanged() {
    this.condition.children = this.condition.kind === 'not' ? [always()] : [];
    this.condition.target = '';
    this.condition.op = 'eq';
    this.changed.emit();
  }
  targetChanged() {
    this.condition.value = this.type === 'boolean' ? false : this.type === 'number' ? 0 : '';
    this.condition.op = 'eq';
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
