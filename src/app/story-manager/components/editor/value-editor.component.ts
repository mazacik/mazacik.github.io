import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Value } from '../../models/story.model';

@Component({
  selector: 'story-value',
  imports: [FormsModule],
  styleUrls: ['./editor.scss'],
  template: `
    @if (type === 'boolean') {
      <select aria-label="Value" [ngModel]="value" (ngModelChange)="valueChange.emit($event)">
        <option [ngValue]="true">True</option>
        <option [ngValue]="false">False</option>
      </select>
    } @else if (type === 'number') {
      <input aria-label="Value" type="number" step="any" [ngModel]="value" (ngModelChange)="valueChange.emit($event)" />
    } @else {
      <input aria-label="Value" type="text" [ngModel]="value" (ngModelChange)="valueChange.emit($event)" />
    }
  `,
})
export class ValueEditorComponent {
  @Input() type = 'text';
  @Input() value: Value;
  @Output() valueChange = new EventEmitter<Value>();
}
