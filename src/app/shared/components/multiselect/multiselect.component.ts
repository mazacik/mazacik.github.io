import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';

export interface MultiselectOption {
  value: string;
  label: string;
  disabled?: boolean;
  reason?: string;
}

@Component({
  selector: 'app-multiselect',
  imports: [FormsModule, NgSelectComponent, NgLabelTemplateDirective, NgOptionTemplateDirective],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './multiselect.component.scss',
  host: { '(keydown)': '$event.stopPropagation()', '(dragstart)': '$event.stopPropagation()' },
  template: `
    <ng-select
      class="app-multiselect-control"
      [items]="options"
      bindLabel="label"
      bindValue="value"
      [multiple]="true"
      [closeOnSelect]="false"
      [clearable]="false"
      [virtualScroll]="false"
      [placeholder]="placeholder"
      [ariaLabel]="label"
      [ariaLabelDropdown]="label"
      [disabled]="disabled"
      [ngModel]="value"
      (ngModelChange)="valueChange.emit($event ?? [])"
      appendTo="body"
      (open)="watchPosition()"
      (close)="stopWatching()">
      <ng-template ng-label-tmp let-item="item" let-clear="clear">
        <span class="multiselect-label" [title]="item.label">{{ item.label }}</span>
        <button
          type="button"
          class="multiselect-remove"
          [disabled]="disabled"
          [attr.aria-label]="'Remove ' + item.label"
          (mousedown)="$event.preventDefault()"
          (click)="clear(item); $event.stopPropagation()">
          ×
        </button>
      </ng-template>
      <ng-template ng-option-tmp let-item="item" let-itemState="item$">
        <span class="multiselect-option-label"
          >{{ item.label }}
          @if (itemState.selected) {
            <span aria-hidden="true">✓</span>
          }
        </span>
        @if (item.reason) {
          <small>{{ item.reason }}</small>
        }
      </ng-template>
    </ng-select>
  `,
})
export class MultiselectComponent implements OnDestroy {
  private renderedOptions: MultiselectOption[] = [];
  private renderedValue: string[] = [];

  // Editors may derive fresh arrays on each check. NgModel schedules an async
  // update for a new array identity, which otherwise creates a render loop.
  @Input() set options(options: MultiselectOption[]) {
    if (
      options.length !== this.renderedOptions.length ||
      options.some((option, index) => {
        const previous = this.renderedOptions[index];
        return option.value !== previous.value || option.label !== previous.label || option.disabled !== previous.disabled || option.reason !== previous.reason;
      })
    )
      this.renderedOptions = options.map((option) => ({ ...option }));
  }
  get options() {
    return this.renderedOptions;
  }

  @Input() set value(value: string[]) {
    if (value.length !== this.renderedValue.length || value.some((id, index) => id !== this.renderedValue[index])) this.renderedValue = [...value];
  }
  get value() {
    return this.renderedValue;
  }
  @Input({ required: true }) label: string;
  @Input() placeholder = 'Select…';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string[]>();
  @ViewChild(NgSelectComponent) select: NgSelectComponent;
  private stop = () => {};

  constructor(private element: ElementRef<HTMLElement>) {}

  watchPosition() {
    this.stopWatching();
    const doc = this.element.nativeElement.ownerDocument;
    // The detached dropdown must not remain floating over a scrolled-away field.
    const scroll = (event: Event) => {
      if (!(event.target as Element)?.closest?.('.ng-dropdown-panel')) this.select.close();
    };
    const resize = () => this.select.close();
    doc.addEventListener('scroll', scroll, true);
    doc.defaultView?.addEventListener('resize', resize);
    this.stop = () => {
      doc.removeEventListener('scroll', scroll, true);
      doc.defaultView?.removeEventListener('resize', resize);
    };
  }

  stopWatching() {
    this.stop();
    this.stop = () => {};
  }

  ngOnDestroy() {
    this.stopWatching();
  }
}
