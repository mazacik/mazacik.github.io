import { Directive, ElementRef, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[onCreate]',
  standalone: true
})
export class OnCreateDirective {

  @Output() onCreate: EventEmitter<ElementRef> = new EventEmitter<ElementRef>();

  constructor(
    private elementRef: ElementRef
  ) { }

  ngOnInit() {
    this.onCreate.emit(this.elementRef);
  }

}
