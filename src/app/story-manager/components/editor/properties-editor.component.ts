import { ReorderComponent } from './reorder.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Property, uid } from '../../models/story.model';
import { ValueEditorComponent } from './value-editor.component';
@Component({
  selector: 'story-properties',
  imports: [ReorderComponent, FormsModule, ValueEditorComponent],
  styleUrls: ['./editor.scss', './properties-editor.component.scss'],
  templateUrl: './properties-editor.component.html',
})
export class PropertiesEditorComponent {
  @Input() properties: Property[] = [];
  @Output() changed = new EventEmitter<void>();
  @Output() remove = new EventEmitter<Property>();
  add() {
    this.properties.push({ id: uid(), name: 'New variable', type: 'boolean', initial: false, known: true });
    this.changed.emit();
  }
  reset(p: Property) {
    p.initial = p.type === 'boolean' ? false : p.type === 'number' ? 0 : '';
    this.changed.emit();
  }
}
