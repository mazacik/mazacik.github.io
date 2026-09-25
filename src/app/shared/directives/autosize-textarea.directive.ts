import { AfterViewChecked, AfterViewInit, Directive, ElementRef, HostListener, NgZone, OnDestroy } from '@angular/core';

@Directive({ selector: 'textarea' })
export class AutosizeTextareaDirective implements AfterViewInit, AfterViewChecked, OnDestroy {
  private observer: ResizeObserver;
  private previous = '';
  private destroyed = false;
  private resizeFrame: number;

  constructor(
    private element: ElementRef<HTMLTextAreaElement>,
    private zone: NgZone,
  ) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      // A height write during ResizeObserver delivery can change scrollbar width
      // and trigger another notification in the same frame. Measure next frame.
      this.observer = new ResizeObserver(() => {
        if (this.resizeFrame !== undefined || this.destroyed) return;
        this.resizeFrame = this.element.nativeElement.ownerDocument.defaultView.requestAnimationFrame(() => {
          this.resizeFrame = undefined;
          this.resize();
        });
      });
      this.observer.observe(this.element.nativeElement);
      this.element.nativeElement.ownerDocument.fonts?.ready.then(() => this.resize(true));
    });
  }

  ngAfterViewChecked() {
    this.resize();
  }

  @HostListener('input')
  resize(force = false) {
    const textarea = this.element.nativeElement;
    if (this.destroyed || !textarea.clientWidth) return;
    const style = textarea.ownerDocument.defaultView.getComputedStyle(textarea);
    const signature = JSON.stringify([
      textarea.value,
      textarea.placeholder,
      textarea.clientWidth,
      style.font,
      style.lineHeight,
      style.padding,
      style.borderWidth,
      style.boxSizing,
      style.minHeight,
      style.minHeight.includes('%') ? textarea.parentElement.clientHeight : 0,
    ]);
    if (!force && signature === this.previous) return;
    this.previous = signature;
    // Measuring a shorter height can temporarily clamp an ancestor's scroll position.
    const scrollPositions: [HTMLElement, number][] = [];
    for (let parent = textarea.parentElement; parent; parent = parent.parentElement) {
      if (parent.scrollTop) scrollPositions.push([parent, parent.scrollTop]);
    }
    // Keep wrapping stable if the temporary height removes a parent scrollbar.
    const previousWidth = textarea.style.width;
    textarea.style.width = style.width;
    textarea.style.height = '0px';
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    textarea.style.height = Math.ceil(textarea.scrollHeight + (style.boxSizing === 'border-box' ? border : -padding)) + 'px';
    textarea.style.width = previousWidth;
    for (const [parent, top] of scrollPositions) parent.scrollTop = top;
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.observer?.disconnect();
    if (this.resizeFrame !== undefined) this.element.nativeElement.ownerDocument.defaultView.cancelAnimationFrame(this.resizeFrame);
  }
}
