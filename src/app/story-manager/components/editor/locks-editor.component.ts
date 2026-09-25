import { AutosizeTextareaDirective } from '../../../shared/directives/autosize-textarea.directive';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Entity, Story, UnlockMethod, newUnlockMethod, resolveEquipment } from '../../models/story.model';
import { unlockContextStory } from '../../engine/story-locks';
import { incomingReferences } from '../../engine/story-validation';
import { DialogService } from '../../../shared/services/dialog.service';
import { ConditionEditorComponent } from './condition-editor.component';
import { OutcomeEditorComponent } from './outcome-editor.component';
import { KeyPickerComponent } from './key-picker.component';
import { ReorderComponent } from './reorder.component';

@Component({
  selector: 'story-locks',
  imports: [AutosizeTextareaDirective, FormsModule, ConditionEditorComponent, OutcomeEditorComponent, KeyPickerComponent, ReorderComponent],
  templateUrl: './locks-editor.component.html',
  styleUrls: ['./editor.scss', './locks-editor.component.scss'],
})
export class LocksEditorComponent {
  @Input({ required: true }) story: Story;
  @Input({ required: true }) entity: Entity;
  @Output() changed = new EventEmitter<void>();
  readonly methodSections = ['Requirements', 'Attempt', 'Results'] as const;
  private sections = new Map<string, (typeof this.methodSections)[number]>();
  methodTabId(method: UnlockMethod, section: string) {
    return 'unlock-' + this.entity.id + '-' + method.id + '-' + section;
  }
  methodSection(method: UnlockMethod) {
    return this.sections.get(JSON.stringify([this.entity.id, method.id])) ?? 'Requirements';
  }
  selectMethodSection(method: UnlockMethod, section: (typeof this.methodSections)[number]) {
    this.sections.set(JSON.stringify([this.entity.id, method.id]), section);
  }
  methodTabKey(event: KeyboardEvent, method: UnlockMethod, section: (typeof this.methodSections)[number]) {
    let index = this.methodSections.indexOf(section);
    if (event.key === 'ArrowRight') index = (index + 1) % this.methodSections.length;
    else if (event.key === 'ArrowLeft') index = (index + this.methodSections.length - 1) % this.methodSections.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = this.methodSections.length - 1;
    else return;
    event.preventDefault();
    this.selectMethodSection(method, this.methodSections[index]);
    (event.currentTarget as HTMLElement).parentElement.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index].focus();
  }
  constructor(private dialogs: DialogService) {}
  get resolved() {
    try {
      return resolveEquipment(this.story, this.entity.id);
    } catch {
      return this.entity;
    }
  }
  get context() {
    return unlockContextStory(this.story, this.entity.id);
  }
  addMethod() {
    if (this.entity.equipmentRole === 'type') return;
    (this.entity.unlockMethods ??= []).push(newUnlockMethod());
    this.changed.emit();
  }
  async removeMethod(method: UnlockMethod) {
    if (await this.dialogs.createConfirmation({ title: 'Delete unlock method', messages: ['Delete ' + method.label + '?', ...incomingReferences(this.story, method.id)] })) {
      this.entity.unlockMethods = this.entity.unlockMethods.filter((m) => m.id !== method.id);
      this.changed.emit();
    }
  }
}
