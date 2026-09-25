import { ListMove, ListReorderDirective } from './list-reorder.directive';
import { moveEntry } from '../../engine/story-order';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { copy, FlagDefinition, newFlag, Story, uid, variableType, variableScope, variableDefault } from '../../models/story.model';
import { validateFlags } from '../../engine/story-flags';
import { ValueEditorComponent } from './value-editor.component';

@Component({
  selector: 'story-flags-editor',
  imports: [ListReorderDirective, FormsModule, ValueEditorComponent],
  templateUrl: './flags-editor.component.html',
  styleUrls: ['./editor.scss', './panels.scss'],
})
export class FlagsEditorComponent {
  @Input({ required: true }) story: Story;
  @Input() selectedId = '';
  @Output() changed = new EventEmitter<void>();
  @Output() remove = new EventEmitter<FlagDefinition>();
  query = '';
  type = variableType;
  scope = variableScope;
  initial = variableDefault;
  resetType(flag: FlagDefinition) {
    flag.initial = this.type(flag) === 'boolean' ? false : this.type(flag) === 'number' ? 0 : '';
    this.changed.emit();
  }
  get flags() {
    return (this.story.flags ?? []).filter((f) => f.name.toLowerCase().includes(this.query.toLowerCase()));
  }
  get selected() {
    return this.story.flags?.find((f) => f.id === this.selectedId);
  }
  get issues() {
    return validateFlags(this.story);
  }
  add() {
    const flag = newFlag();
    (this.story.flags ??= []).push(flag);
    this.selectedId = flag.id;
    this.changed.emit();
  }
  duplicate(flag: FlagDefinition) {
    const duplicate = { ...copy(flag), id: uid(), name: `${flag.name} (copy)` };
    this.story.flags.push(duplicate);
    this.selectedId = duplicate.id;
    this.changed.emit();
  }
  reorder(move: ListMove) {
    if (this.query) return;
    if (
      moveEntry(
        this.story.flags,
        this.story.flags.findIndex((flag) => flag.id === move.id),
        move.offset,
      )
    )
      this.changed.emit();
  }
}
