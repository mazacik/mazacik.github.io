import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Story } from '../../models/story.model';
import { coveredLayers, layerErrors } from '../../engine/story-layers';
import { moveEntry } from '../../engine/story-order';
import { DialogService } from '../../../shared/services/dialog.service';
import { ListReorderDirective, ListMove } from './list-reorder.directive';
import { MultiselectComponent, MultiselectOption } from '../../../shared/components/multiselect/multiselect.component';

@Component({
  selector: 'story-layers',
  imports: [ListReorderDirective, MultiselectComponent],
  styleUrls: ['./editor.scss', './layers-editor.component.scss'],
  template: `
    <h3>Equipment layers</h3>
    <p class="muted">Choose which layers each layer covers. Coverage follows chains; list order only changes the display.</p>
    @if (error) {
      <p class="danger" role="alert">{{ error }}</p>
    }
    @for (message of errors; track $index) {
      <p class="danger">{{ message }}</p>
    }
    <div [storyListReorder]="rows" (reordered)="reorder($event)">
      @for (layer of story.slots; track layer) {
        <section class="box layer-row" [attr.data-reorder-id]="layer" draggable="true" tabindex="0" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown">
          <strong>{{ layer }}</strong>
          <div class="layer-coverage">
            <span>Covers</span>
            <app-multiselect
              [label]="layer + ' covers'"
              placeholder="Select layers…"
              [options]="coverageOptions(layer)"
              [value]="story.layerCoverage?.[layer] ?? []"
              (valueChange)="setCoveredLayers(layer, $event)" />
          </div>
          <div class="entry-actions"><button (click)="rename(layer)">Rename</button><button (click)="remove(layer)">Delete</button></div>
        </section>
      }
    </div>
    <button (click)="add()">Create layer</button>
  `,
})
export class LayersEditorComponent {
  @Input({ required: true }) story: Story;
  @Output() changed = new EventEmitter<void>();
  error = '';
  constructor(private dialogs: DialogService) {}
  get rows() {
    return this.story.slots.map((id) => ({ id }));
  }
  get errors() {
    return layerErrors(this.story);
  }
  covers(layer: string, target: string) {
    return this.story.layerCoverage?.[layer]?.includes(target) ?? false;
  }
  createsCycle(layer: string, target: string) {
    return layer === target || coveredLayers(this.story, target).has(layer);
  }
  coverageOptions(layer: string): MultiselectOption[] {
    return [...new Set([...this.story.slots, ...(this.story.layerCoverage?.[layer] ?? [])])]
      .filter((target) => target !== layer || this.covers(layer, target))
      .map((target) => {
        const disabled = !this.covers(layer, target) && this.createsCycle(layer, target);
        return { value: target, label: this.story.slots.includes(target) ? target : 'Missing layer: ' + target, disabled, reason: disabled ? 'Would create a coverage cycle.' : undefined };
      });
  }
  setCoveredLayers(layer: string, values: string[]) {
    const targets = [...new Set(values)];
    if (targets.some((target) => !this.covers(layer, target) && (!this.story.slots.includes(target) || this.createsCycle(layer, target)))) {
      this.error = 'Layer coverage cannot contain a cycle.';
      return;
    }
    this.story.layerCoverage = { ...this.story.layerCoverage, [layer]: targets };
    this.error = '';
    this.changed.emit();
  }
  reorder(move: ListMove) {
    if (moveEntry(this.story.slots, this.story.slots.indexOf(move.id), move.offset)) this.changed.emit();
  }
  private valid(name: string, previous = '') {
    if (!name || (name !== previous && this.story.slots.includes(name))) {
      this.error = 'Choose a unique, nonempty layer name.';
      return false;
    }
    this.error = '';
    return true;
  }
  async add() {
    const value = await this.dialogs.createInput({ title: 'Create layer', placeholder: 'Layer name', defaultValue: '' });
    if (value === undefined || value === null) return;
    const name = value.trim();
    if (!this.valid(name)) return;
    this.story.slots.push(name);
    this.changed.emit();
  }
  async rename(layer: string) {
    const value = await this.dialogs.createInput({ title: 'Rename layer', placeholder: 'Layer name', defaultValue: layer });
    if (value === undefined || value === null) return;
    const name = value.trim();
    if (!this.valid(name, layer) || name === layer) return;
    this.story.slots = this.story.slots.map((s) => (s === layer ? name : s));
    for (const e of this.story.entities) if (e.kind === 'equipment' && e.requiredSlots) e.requiredSlots = e.requiredSlots.map((s) => (s === layer ? name : s));
    this.story.layerCoverage = Object.fromEntries(Object.entries(this.story.layerCoverage ?? {}).map(([key, targets]) => [key === layer ? name : key, targets.map((s) => (s === layer ? name : s))]));
    this.changed.emit();
  }
  async remove(layer: string) {
    if (
      !(await this.dialogs.createConfirmation({
        title: 'Delete layer',
        messages: ['Delete ' + layer + '? Coverage links will be removed. Equipment using this layer will need its assignment repaired.'],
      }))
    )
      return;
    this.story.slots = this.story.slots.filter((s) => s !== layer);
    this.story.layerCoverage = Object.fromEntries(
      Object.entries(this.story.layerCoverage ?? {})
        .filter(([key]) => key !== layer)
        .map(([key, targets]) => [key, targets.filter((s) => s !== layer)]),
    );
    this.changed.emit();
  }
}
