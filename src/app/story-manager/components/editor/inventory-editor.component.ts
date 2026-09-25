import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Entity, isKey, Story, uid } from '../../models/story.model';
import { inventoryIssues, itemTargets } from '../../engine/story-inventory';
import { ReorderComponent } from './reorder.component';
@Component({
  selector: 'story-inventory-editor',
  imports: [FormsModule, ReorderComponent],
  styleUrls: ['./editor.scss'],
  template: `
    <h3>Starting inventory</h3>
    @for (row of entity.inventory ?? []; track row.id) {
      <div class="box field-row">
        <div class="entry-actions">
          <story-reorder [items]="entity.inventory" [index]="$index" label="inventory entry" (changed)="changed.emit()" /><button (click)="remove($index)">Remove from inventory</button>
        </div>
        <strong>{{ name(row.target) }}</strong>
        <label>Quantity<input type="number" min="1" step="1" [(ngModel)]="row.quantity" (ngModelChange)="changed.emit()" /></label>
      </div>
    }
    <div class="field-row">
      <label>Find item or key<input [(ngModel)]="query" /></label>
      <label
        >Item or key<select [(ngModel)]="selected">
          <option value="">Choose item or key</option>
          @for (group of targetGroups; track group.label) {
            <optgroup [label]="group.label">
              @for (item of group.items; track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </optgroup>
          }
        </select></label
      >
      <button [disabled]="!selected" (click)="add()">Add to starting inventory</button>
    </div>
    @for (issue of issues; track $index) {
      <p class="danger">{{ issue.message }}</p>
    }
  `,
})
export class InventoryEditorComponent {
  @Input({ required: true }) story: Story;
  @Input({ required: true }) entity: Entity;
  @Output() changed = new EventEmitter<void>();
  selected = '';
  query = '';
  get targets() {
    return itemTargets(this.story)
      .filter((e) => e.kind === 'object')
      .filter((e) => e.name.toLowerCase().includes(this.query.toLowerCase()));
  }
  get targetGroups() {
    return [
      { label: 'Items', items: this.targets.filter((e) => !isKey(this.story, e)) },
      { label: 'Keys', items: this.targets.filter((e) => isKey(this.story, e)) },
    ].filter((group) => group.items.length);
  }
  get issues() {
    return inventoryIssues(this.story).filter((i) => i.entity === this.entity.id && i.section === 'Inventory');
  }
  name(id: string) {
    return itemTargets(this.story).find((e) => e.id === id)?.name ?? 'Missing item';
  }
  add() {
    if (!this.targets.some((e) => e.id === this.selected)) return;
    const inventory = (this.entity.inventory ??= []);
    const existing = inventory.find((row) => row.target === this.selected && !row.equipped);
    if (existing) {
      if (!Number.isSafeInteger(existing.quantity) || existing.quantity < 1 || !Number.isSafeInteger(existing.quantity + 1)) return;
      existing.quantity++;
    } else inventory.push({ id: uid(), target: this.selected, quantity: 1, equipped: false });
    this.selected = '';
    this.changed.emit();
  }
  remove(index: number) {
    this.entity.inventory.splice(index, 1);
    this.changed.emit();
  }
}
