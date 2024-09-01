import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[class-hover]',
  standalone: true
})
export class ClassHoverDirective {

  @Input('hover-class') class: any;

  @HostListener('mouseenter') onMouseEnter() {
    this.elementRef.nativeElement.classList.add(this.class);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.elementRef.nativeElement.classList.remove(this.class);
  }

  constructor(
    private elementRef: ElementRef
  ) { }

}
