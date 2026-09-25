import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MultiselectComponent } from '../../../shared/components/multiselect/multiselect.component';
import { isKey, Story, uid } from '../../models/story.model';
import { DialogService } from '../../../shared/services/dialog.service';

@Component({
  selector: 'story-key-picker',
  imports: [MultiselectComponent],
  styleUrls: ['./editor.scss'],
  template: `
    <app-multiselect label="Matching keys" placeholder="Select keys..." [options]="options" [value]="keys" (valueChange)="setKeys($event)" />
    <button (click)="create()">Create key</button>
  `,
})
export class KeyPickerComponent {
  @Input({ required: true }) story: Story;
  @Input() keys: string[] = [];
  @Output() keysChange = new EventEmitter<string[]>();
  constructor(private dialogs: DialogService) {}
  get items() {
    return this.story.entities.filter((e) => isKey(this.story, e));
  }
  name(id: string) {
    return this.story.entities.find((e) => e.id === id && e.kind === 'object')?.name ?? 'Missing key: ' + id;
  }
  get options() {
    return [
      ...this.items.map((item) => ({ value: item.id, label: item.name })),
      ...this.keys.filter((id) => !this.items.some((item) => item.id === id)).map((id) => ({ value: id, label: this.name(id), disabled: true })),
    ];
  }
  setKeys(ids: string[]) {
    this.keysChange.emit([...new Set(ids.filter((id) => this.keys.includes(id) || this.items.some((item) => item.id === id)))]);
  }
  async create() {
    const name = await this.dialogs.createInput({ title: 'Create key', placeholder: 'Key name', defaultValue: 'New key' });
    if (!name?.trim()) return;
    const id = uid();
    this.story.entities.push({ id, name: name.trim(), kind: 'object', key: true, description: '', notes: '', known: true, properties: [] });
    this.keysChange.emit([...this.keys, id]);
  }
}
