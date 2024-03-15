import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';

@Directive({
  selector: '[smallscreen]',
  standalone: true
})
export class SmallScreenDirective implements OnInit {

  constructor(
    private elementRef: ElementRef
  ) { }

  ngOnInit() {
    this.updateVisibility(window.innerWidth);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.updateVisibility((event.target as Window).innerWidth);
  }

  private updateVisibility(screenWidth: number) {
    if (screenWidth <= 600) {
      (this.elementRef.nativeElement as HTMLElement).style.display = '';
    } else {
      (this.elementRef.nativeElement as HTMLElement).style.display = 'none';
    }
  }
}