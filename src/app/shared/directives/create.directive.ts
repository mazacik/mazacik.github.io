import { Directive, ElementRef, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[create]',
  standalone: true
})
export class CreateDirective {

  @Output() create: EventEmitter<ElementRef> = new EventEmitter<ElementRef>();

  constructor(
    private elementRef: ElementRef
  ) { }

  ngOnInit() {
    this.create.emit(this.elementRef);
  }

}
