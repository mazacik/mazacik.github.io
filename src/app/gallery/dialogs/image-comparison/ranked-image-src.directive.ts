import { Directive, ElementRef, Input, inject } from '@angular/core';

@Directive({ selector: 'img[rankedSrc]' })
export class RankedImageSrcDirective {
  private readonly image = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;

  @Input() set rankedSrc(src: string) {
    this.image.classList.remove('loaded');
    if (src) this.image.src = src;
    else this.image.removeAttribute('src');
  }
}
