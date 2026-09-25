import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutosizeTextareaDirective } from '../../../shared/directives/autosize-textarea.directive';
import { allProperties, isKey, referenceEntities, Story } from '../../models/story.model';
@Component({
  selector: 'story-text-editor',
  imports: [FormsModule, AutosizeTextareaDirective],
  styleUrls: ['./editor.scss'],
  template:
    '<label>Dialogue text<textarea #editor aria-label="Scene text" [ngModel]="text" (ngModelChange)="update($event,editor)" (click)="cursor = editor.selectionStart" (keyup)="cursor = editor.selectionStart" placeholder="Write narration or dialogue. Type [[ to insert a reference."></textarea></label><div class="entry-actions"><button (click)="open(editor)">Insert reference</button></div>@if (show) { <div class="box"><label>Find reference<input aria-label="Search references" placeholder="Search characters, equipment, items, keys, variables" [(ngModel)]="query" /></label><div class="entry-actions">@for (ref of references; track ref.token) { <button (click)="insert(ref.token,editor)">{{ref.label}}</button> }</div><button (click)="show = false">Close picker</button></div> }<p class="muted">Reader preview</p><div class="prose">{{preview}}</div>',
})
export class TextEditorComponent {
  @Input() story: Story;
  @Input() text = '';
  @Output() textChange = new EventEmitter<string>();
  show = false;
  query = '';
  cursor = 0;
  private replaceStart = -1;
  get references() {
    return [
      ...referenceEntities(this.story).map((e) => ({
        label: e.name + ' · ' + (isKey(this.story, e) ? 'key' : e.kind === 'object' ? 'item' : this.story.copies?.some((c) => c.id === e.id) ? 'equipment copy' : e.kind),
        token: '[[' + e.kind + ':' + e.id + ']]',
      })),
      ...allProperties(this.story).map((p) => ({ label: p.label, token: '[[property:' + p.property.id + ']]' })),
    ].filter((r) => r.label.toLowerCase().includes(this.query.toLowerCase()));
  }
  get preview() {
    return this.text.replace(/\[\[(character|object|equipment|property):([^\]]+)\]\]/g, (_, kind, id) =>
      kind === 'property'
        ? '{' + (allProperties(this.story).find((p) => p.property.id === id)?.label ?? 'Missing property') + '}'
        : (referenceEntities(this.story).find((e) => e.kind === kind && e.id === id)?.name ?? '[Missing reference]'),
    );
  }
  update(value: string, editor: HTMLTextAreaElement) {
    this.text = value;
    this.cursor = editor.selectionStart;
    this.textChange.emit(value);
    if (value.slice(0, this.cursor).endsWith('[[')) {
      this.replaceStart = this.cursor - 2;
      this.show = true;
      this.query = '';
    }
  }
  open(editor: HTMLTextAreaElement) {
    this.cursor = editor.selectionStart;
    this.replaceStart = -1;
    this.show = true;
    this.query = '';
  }
  insert(token: string, editor: HTMLTextAreaElement) {
    const start = this.replaceStart >= 0 ? this.replaceStart : this.cursor;
    this.text = this.text.slice(0, start) + token + this.text.slice(this.cursor);
    this.textChange.emit(this.text);
    this.show = false;
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start + token.length, start + token.length);
    });
  }
}
