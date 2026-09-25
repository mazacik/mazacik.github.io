import { inventoryIssues } from '../../engine/story-inventory';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Entity, EquipmentCopy, Story, Value, copy, resolveEquipment, uid } from '../../models/story.model';
import { incomingReferences } from '../../engine/story-validation';
import { DialogService } from '../../../shared/services/dialog.service';
import { KeyPickerComponent } from './key-picker.component';
import { ValueEditorComponent } from './value-editor.component';

@Component({
  selector: 'story-character-equipment',
  imports: [FormsModule, KeyPickerComponent, ValueEditorComponent],
  templateUrl: './character-equipment.component.html',
  styleUrls: ['./editor.scss'],
})
export class CharacterEquipmentComponent {
  @Input({ required: true }) story: Story;
  @Input({ required: true }) entity: Entity;
  @Input() set focusCopyId(id: string) {
    this.expandedId = id;
  }
  @Output() changed = new EventEmitter<void>();
  selected = '';
  existingId = '';
  expandedId = '';
  constructor(private dialogs: DialogService) {}

  get issues() {
    return inventoryIssues(this.story).filter((i) => i.entity === this.entity.id && i.section === 'Equipment');
  }
  get templates() {
    return this.story.entities.filter((e) => e.kind === 'equipment' && e.equipmentRole !== 'type');
  }
  get copies() {
    return (this.story.copies ?? []).filter((c) => c.owner === this.entity.id);
  }
  get unassigned() {
    return (this.story.copies ?? []).filter((c) => !this.story.entities.some((e) => e.kind === 'character' && e.id === c.owner));
  }
  resolved(c: EquipmentCopy) {
    try {
      return resolveEquipment(this.story, c.definition);
    } catch {
      return undefined;
    }
  }
  templateName(c: EquipmentCopy) {
    return this.templates.find((e) => e.id === c.definition)?.name ?? 'Missing template';
  }
  addCopy() {
    const template = this.templates.find((e) => e.id === this.selected);
    if (!template || this.entity.kind !== 'character') return;
    let number = 1;
    while (this.story.copies?.some((c) => c.name === template.name + ' ' + number)) number++;
    this.expandedId = uid();
    (this.story.copies ??= []).push({ id: this.expandedId, definition: template.id, name: template.name + ' ' + number, owner: this.entity.id, equipped: false, values: {} });
    this.changed.emit();
  }
  addExisting() {
    const c = this.unassigned.find((c) => c.id === this.existingId);
    if (!c || this.entity.kind !== 'character') return;
    if (this.story.entities.find((e) => e.id === c.definition)?.equipmentRole === 'type') return;
    c.owner = this.entity.id;
    this.expandedId = c.id;
    this.existingId = '';
    this.changed.emit();
  }
  duplicateCopy(c: EquipmentCopy) {
    if (this.story.entities.find((e) => e.id === c.definition)?.equipmentRole === 'type') return;
    this.expandedId = uid();
    this.story.copies.push({ ...copy(c), id: this.expandedId, name: c.name + ' (copy)', owner: this.entity.id, equipped: false, locked: false });
    this.changed.emit();
  }
  removeFromInventory(c: EquipmentCopy) {
    c.owner = '';
    c.equipped = false;
    c.locked = false;
    this.changed.emit();
  }
  async deleteCopy(c: EquipmentCopy) {
    const refs = incomingReferences(this.story, c.id);
    if (await this.dialogs.createConfirmation({ title: 'Delete equipment copy', messages: ['Delete "' + c.name + '"?', ...refs.map((r) => 'Used by: ' + r)] })) {
      this.story.copies = this.story.copies.filter((i) => i.id !== c.id);
      this.changed.emit();
    }
  }
  setEquipped(c: EquipmentCopy, equipped: boolean) {
    c.equipped = equipped;
    if (!equipped) c.locked = false;
    this.changed.emit();
  }
  setKeys(c: EquipmentCopy, enabled: boolean) {
    if (enabled) c.keyItems = [...(this.resolved(c)?.keyItems ?? [])];
    else delete c.keyItems;
    this.changed.emit();
  }
  copyOverride(c: EquipmentCopy, id: string) {
    return Object.hasOwn(c.values, id);
  }
  setCopyValue(c: EquipmentCopy, id: string, value: Value) {
    c.values[id] = value;
    this.changed.emit();
  }
  resetCopyValue(c: EquipmentCopy, id: string) {
    delete c.values[id];
    this.changed.emit();
  }
  invalidCopyValues(c: EquipmentCopy) {
    return Object.keys(c.values).filter((id) => !this.resolved(c)?.properties.some((p) => p.id === id));
  }
}
