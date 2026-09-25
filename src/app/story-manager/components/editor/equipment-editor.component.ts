import { LocksEditorComponent } from './locks-editor.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Entity, EntityDetailSection, Property, Story, Value, newFlag, resolveEquipment, variableScope, variableType } from '../../models/story.model';
import { ValueEditorComponent } from './value-editor.component';
import { PropertiesEditorComponent } from './properties-editor.component';
import { MultiselectComponent } from '../../../shared/components/multiselect/multiselect.component';
import { DialogService } from '../../../shared/services/dialog.service';
@Component({
  selector: 'story-equipment-editor',
  imports: [LocksEditorComponent, FormsModule, ValueEditorComponent, PropertiesEditorComponent, MultiselectComponent],
  templateUrl: './equipment-editor.component.html',
  styleUrls: ['./editor.scss'],
})
export class EquipmentEditorComponent {
  @Input({ required: true }) story: Story;
  @Input({ required: true }) entity: Entity;
  @Input() section: EntityDetailSection = 'General';
  @Output() changed = new EventEmitter<void>();
  @Output() removeProperty = new EventEmitter<Property>();
  constructor(private dialogs: DialogService) {}
  get resolved() {
    try {
      return resolveEquipment(this.story, this.entity.id);
    } catch {
      return this.entity;
    }
  }
  get parent() {
    try {
      return this.entity.parentId ? resolveEquipment(this.story, this.entity.parentId) : undefined;
    } catch {
      return undefined;
    }
  }
  get inheritanceError() {
    try {
      resolveEquipment(this.story, this.entity.id);
      return '';
    } catch (e) {
      return (e as Error).message;
    }
  }
  get parents() {
    return this.story.entities.filter((e) => e.kind === 'equipment' && e.equipmentRole === 'type');
  }
  setParent(id: string) {
    if (this.entity.equipmentRole === 'type' || (id && !this.parents.some((e) => e.id === id))) return;
    this.entity.equipmentRole = 'variant';
    this.entity.parentId = id;
    if (id && !this.entity.requiredSlots?.length) delete this.entity.requiredSlots;
    this.changed.emit();
  }
  setSlotsOverride(enabled: boolean) {
    if (enabled) this.entity.requiredSlots = [...(this.resolved.requiredSlots ?? [])];
    else delete this.entity.requiredSlots;
    this.changed.emit();
  }
  setSlots(slots: string[]) {
    if (this.entity.parentId && this.entity.requiredSlots === undefined) return;
    this.entity.requiredSlots = [...new Set(slots)];
    this.changed.emit();
  }
  setOverride(id: string, value: Value) {
    (this.entity.propertyOverrides ??= {})[id] = value;
    this.changed.emit();
  }
  resetOverride(id: string) {
    delete this.entity.propertyOverrides[id];
    this.changed.emit();
  }
  ownOverride(id: string) {
    return Object.hasOwn(this.entity.propertyOverrides ?? {}, id);
  }
  get invalidOverrides() {
    return Object.keys(this.entity.propertyOverrides ?? {}).filter((id) => !this.parent?.properties.some((p) => p.id === id));
  }
  get grantVariables() {
    return (this.story.flags ?? []).filter((v) => variableScope(v) === 'character' && variableType(v) === 'boolean');
  }
  get selectedEffects() {
    return [...new Set((this.resolved.flagGrants ?? []).filter((g) => !g.suppressed).map((g) => g.flag))];
  }
  get effectOptions() {
    return [
      ...this.grantVariables.map((v) => ({ value: v.id, label: v.name, reason: this.inheritedGrant(v.id) ? 'From type ' + this.parent.name : undefined })),
      ...this.selectedEffects.filter((id) => !this.grantVariables.some((v) => v.id === id)).map((id) => ({ value: id, label: 'Missing or incompatible effect: ' + id, disabled: true })),
    ];
  }
  setEffects(ids: string[]) {
    const previous = new Set(this.selectedEffects);
    const selected = new Set(ids.filter((id) => previous.has(id) || this.grantVariables.some((v) => v.id === id)));
    const removed = [...previous].filter((id) => !selected.has(id));
    const added = [...selected].filter((id) => !previous.has(id));
    if (!removed.length && !added.length) return;
    const grants = (this.entity.flagGrants ?? []).filter((g) => !removed.includes(g.flag) && !added.includes(g.flag));
    for (const id of removed) if (this.inheritedGrant(id)) grants.push({ flag: id, when: 'equipped', suppressed: true });
    for (const id of added) if (!this.inheritedGrant(id)) grants.push({ flag: id, when: 'equipped' });
    this.entity.flagGrants = grants;
    this.changed.emit();
  }
  async createGrantVariable() {
    const story = this.story,
      entity = this.entity;
    const name = await this.dialogs.createInput({ title: 'Create effect', placeholder: 'For example: Protected from curses', defaultValue: '' });
    if (!name?.trim() || this.story !== story || this.entity !== entity || !story.entities.includes(entity)) return;
    const variable = { ...newFlag(), name: name.trim(), scope: 'character' as const, type: 'boolean' as const, initial: false };
    (story.flags ??= []).push(variable);
    this.setGrant(variable.id, 'equipped');
  }
  inheritedGrant(id: string) {
    return this.parent?.flagGrants?.find((g) => g.flag === id);
  }
  ownGrant(id: string) {
    return this.entity.flagGrants?.find((g) => g.flag === id);
  }
  setGrant(id: string, mode: string) {
    this.entity.flagGrants = (this.entity.flagGrants ?? []).filter((g) => g.flag !== id);
    if (mode !== 'inherit') this.entity.flagGrants.push({ flag: id, when: 'equipped', suppressed: mode === 'off' });
    this.changed.emit();
  }
  get invalidGrants() {
    return (this.entity.flagGrants ?? []).filter((g) => !this.grantVariables.some((v) => v.id === g.flag));
  }
  removeInvalidGrant(id: string) {
    this.entity.flagGrants = this.entity.flagGrants.filter((g) => g.flag !== id);
    this.changed.emit();
  }
  get missingSlots() {
    return (this.resolved.requiredSlots ?? []).filter((slot) => !this.story.slots.includes(slot));
  }
  get layerOptions() {
    return [...new Set([...this.story.slots, ...this.missingSlots])].map((slot) => ({
      value: slot,
      label: this.story.slots.includes(slot) ? slot : 'Missing layer: ' + slot,
    }));
  }
}
