import { Component, EventEmitter, Input, Output } from '@angular/core';
import { moveEntry } from '../../engine/story-order';
@Component({
  selector: 'story-reorder',
  styleUrls: ['./editor.scss'],
  // A filtered list may have hidden siblings; retain its disabled controls.
  host: { '[style.display]': 'items.length > 1 || disabled ? null : "none"' },
  template: `@if (items.length > 1 || disabled) {
    <span class="reorder"
      ><button type="button" [disabled]="disabled || index <= 0" [attr.aria-label]="'Move ' + label + ' up'" (click)="move(-1)">↑</button
      ><button type="button" [disabled]="disabled || index >= items.length - 1" [attr.aria-label]="'Move ' + label + ' down'" (click)="move(1)">↓</button>
    </span>
  }`,
})
export class ReorderComponent {
  @Input({ required: true }) items: unknown[];
  @Input() index = 0;
  @Input() disabled = false;
  @Input() label = 'entry';
  @Input() mutate = true;
  @Output() changed = new EventEmitter<void>();
  @Output() moved = new EventEmitter<number>();
  move(offset: number) {
    if (this.disabled || this.index + offset < 0 || this.index + offset >= this.items.length) return;
    if (this.mutate) moveEntry(this.items, this.index, offset);
    this.moved.emit(offset);
    this.changed.emit();
  }
}
