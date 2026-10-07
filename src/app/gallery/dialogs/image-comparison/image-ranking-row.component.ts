import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ImageComponent } from '../../../shared/components/image/image.component';
import { GalleryUtils } from '../../../shared/utils/gallery.utils';
import { GalleryImage } from '../../models/gallery-image.class';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';

export interface RankedRowSubject {
  id: string;
  image: GalleryImage | null;
}

export interface RankedRowPlacement {
  subjectId: string;
  index: number;
}

@Component({
  selector: 'app-image-ranking-row',
  imports: [ImageComponent],
  templateUrl: './image-ranking-row.component.html',
  styleUrls: ['./image-ranking-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageRankingRowComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) public activeImage: GalleryImage;
  @Input({ required: true }) public rankedSubjects: RankedRowSubject[] = [];
  @Output() public readonly place = new EventEmitter<RankedRowPlacement>();
  @Output() public readonly selectionChange = new EventEmitter<number>();
  @Output() public readonly fullscreen = new EventEmitter<GalleryImage>();
  @Output() public readonly restart = new EventEmitter<MouseEvent>();
  @Output() public readonly skip = new EventEmitter<MouseEvent>();
  @ViewChild('rankedScroller') private scroller?: ElementRef<HTMLElement>;

  protected readonly galleryUtils = GalleryUtils;
  protected displayedImage: GalleryImage;
  protected selectedIndex = 0;
  private activeSubjectId: string;
  private confirmedSubjectId: string | null = null;
  private resizeObserver?: ResizeObserver;
  private frame: number | null = null;
  private motionFrame: number | null = null;
  private motionActive = false;
  private motionTarget = 0;
  private targetIndex: number | null = null;
  private lastFrameTime: number | null = null;
  private settleTimer: number | null = null;
  private geometryDirty = true;
  private gapOffsets: number[] = [];
  private maximumScroll = 0;
  private lastWrittenScroll: number | null = null;
  private emittedSelection: number | null = null;
  private readonly listenerCleanup: (() => void)[] = [];
  private destroyed = false;

  constructor(private readonly zone: NgZone) { }

  public ngOnChanges(changes: SimpleChanges): void {
    const subjectId = GallerySortUtils.getSortSubjectId(this.activeImage);
    if (subjectId !== this.activeSubjectId) this.confirmedSubjectId = null;
    if (subjectId !== this.activeSubjectId || (changes['activeImage'] && this.activeImage !== changes['activeImage'].previousValue)) {
      this.activeSubjectId = subjectId;
      this.displayedImage = this.activeImage;
    }
    if (changes['activeImage'] || changes['rankedSubjects']) {
      this.geometryDirty = true;
      this.resetPosition();
    }
  }

  public ngAfterViewInit(): void {
    const element = this.scroller.nativeElement;
    // Scroll frames must not recheck the gallery's hidden views.
    this.zone.runOutsideAngular(() => {
      this.listen(element, 'wheel', event => this.onWheel(event as WheelEvent), { passive: false });
      this.listen(element, 'scroll', () => this.onScroll(), { passive: true });
      this.listen(element, 'scrollend', () => this.onScrollEnd(), { passive: true });
      this.listen(element, 'load', event => this.onThumbnailLoad(event), { capture: true, passive: true });
      this.resizeObserver = new ResizeObserver(() => {
        this.geometryDirty = true;
        this.scheduleAlignment();
      });
      this.resizeObserver.observe(element);
    });
    this.scheduleAlignment();
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
    this.listenerCleanup.forEach(cleanup => cleanup());
    this.stopMotion();
    this.resizeObserver?.disconnect();
    this.cancelAlignment();
    this.clearSettleTimer();
  }

  public resetPosition(): void {
    this.stopMotion();
    this.clearSettleTimer();
    this.selectedIndex = Math.floor(this.rankedSubjects.length / 2);
    this.scheduleAlignment();
  }

  protected onScroll(): void {
    if (this.frame !== null || this.motionActive) return;
    const scrollTop = this.scroller.nativeElement.scrollTop;
    if (this.lastWrittenScroll !== null && Math.abs(scrollTop - this.lastWrittenScroll) < 1) return;
    this.updateSelection();
    this.clearSettleTimer();
    this.settleTimer = window.setTimeout(() => this.onScrollEnd(), 180);
  }

  protected onScrollEnd(): void {
    if (this.frame !== null || this.motionActive) return;
    this.clearSettleTimer();
    this.updateSelection();
    const target = this.targetScrollTop(this.selectedIndex);
    if (target === null) return;
    if (Math.abs(this.scroller.nativeElement.scrollTop - target) > 1) {
      this.queueMotion(target, this.selectedIndex);
    } else {
      this.writeScroll(target);
    }
  }

  protected onWheel(event: WheelEvent): void {
    if (event.ctrlKey) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    this.stepPlacement(delta > 0 ? 1 : -1);
  }

  protected thumbnailAspectRatio(image: GalleryImage | null): number | null {
    const dimensions = image?.imageMediaMetadata ?? image?.videoMediaMetadata;
    const ratio = image?.aspectRatio || ((dimensions?.width ?? 0) / (dimensions?.height ?? 0));
    return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
  }

  protected onThumbnailLoad(event?: Event): void {
    // Known aspect ratios already reserve the exact thumbnail height.
    const image = event?.target as HTMLImageElement | undefined;
    if (image?.parentElement?.style.aspectRatio) return;
    this.geometryDirty = true;
    this.scheduleAlignment();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    this.stepPlacement(event.key === 'ArrowUp' ? -1 : 1);
  }

  protected confirmPlacement(event?: MouseEvent): void {
    if (this.destroyed || !this.activeSubjectId || this.confirmedSubjectId === this.activeSubjectId || (event?.detail ?? 0) > 1) return;
    const subjectId = this.activeSubjectId;
    // Capture the logical destination before cancelling its animation.
    const destination = this.targetIndex ?? (this.frame !== null
      ? this.selectedIndex
      : this.nearestGapIndex(this.scroller?.nativeElement.scrollTop ?? 0));
    const index = Math.max(0, Math.min(this.rankedSubjects.length, destination));
    this.confirmedSubjectId = subjectId;
    this.stopMotion();
    this.cancelAlignment();
    this.clearSettleTimer();
    const target = this.targetScrollTop(index);
    if (target !== null) this.writeScroll(target);
    this.selectIndex(index);
    this.place.emit({ subjectId, index });
  }

  protected openFullscreen(image: GalleryImage, event?: Event): void {
    event?.preventDefault();
    if (image) this.fullscreen.emit(image);
  }

  protected showGroupImage(direction: -1 | 1): void {
    const images = this.displayedImage.group?.images ?? [];
    if (images.length < 2) return;
    const index = images.indexOf(this.displayedImage);
    this.displayedImage = images[(index + direction + images.length) % images.length];
  }

  private stepPlacement(direction: -1 | 1): void {
    if (this.targetIndex === null && this.frame === null) this.updateSelection();
    const index = Math.max(0, Math.min(this.rankedSubjects.length, (this.targetIndex ?? this.selectedIndex) + direction));
    const target = this.targetScrollTop(index);
    if (target === null) return;
    if (!this.motionActive && Math.abs(this.scroller.nativeElement.scrollTop - target) < 1) return;
    // Repeated inputs advance from the requested gap, even mid-animation.
    this.queueMotion(target, index);
  }

  private queueMotion(target: number, index: number): void {
    this.refreshGeometry();
    if (!this.motionActive) this.lastFrameTime = null;
    this.motionActive = true;
    this.targetIndex = index;
    this.motionTarget = Math.max(0, Math.min(this.maximumScroll, target));
    this.clearSettleTimer();
    this.requestMotionFrame();
  }

  private requestMotionFrame(): void {
    if (this.motionFrame !== null) return;
    this.zone.runOutsideAngular(() => {
      this.motionFrame = window.requestAnimationFrame(time => this.animateScroll(time));
    });
  }

  private animateScroll(time: number): void {
    this.motionFrame = null;
    if (!this.motionActive || this.destroyed) return;
    this.refreshGeometry();
    if (this.targetIndex !== null) this.motionTarget = this.targetScrollTop(this.targetIndex) ?? this.motionTarget;
    this.motionTarget = Math.max(0, Math.min(this.maximumScroll, this.motionTarget));
    const current = this.scroller.nativeElement.scrollTop;
    const remaining = this.motionTarget - current;
    const elapsed = this.lastFrameTime === null ? 16 : Math.min(64, time - this.lastFrameTime);
    this.lastFrameTime = time;
    const next = Math.abs(remaining) < 1.5
      ? this.motionTarget
      : current + remaining * (1 - Math.exp(-elapsed / 45));
    this.writeScroll(next);
    // Native scrolling rounds fractional positions; finish if easing cannot advance.
    if (this.scroller.nativeElement.scrollTop === current) this.writeScroll(this.motionTarget);
    if (Math.abs(this.motionTarget - this.scroller.nativeElement.scrollTop) >= 1) {
      this.requestMotionFrame();
      return;
    }
    this.motionActive = false;
    this.targetIndex = null;
    this.lastFrameTime = null;
  }

  private stopMotion(): void {
    if (this.motionFrame !== null) window.cancelAnimationFrame(this.motionFrame);
    this.motionFrame = null;
    this.motionActive = false;
    this.targetIndex = null;
    this.lastFrameTime = null;
  }

  private writeScroll(top: number): void {
    const element = this.scroller.nativeElement;
    element.scrollTo({ top, behavior: 'instant' });
    this.lastWrittenScroll = element.scrollTop;
    this.updateSelection();
  }

  private scheduleAlignment(): void {
    if (this.destroyed || this.motionActive) return;
    this.cancelAlignment();
    this.zone.runOutsideAngular(() => {
      this.frame = window.requestAnimationFrame(() => {
        this.frame = null;
        if (this.motionActive) return;
        const target = this.targetScrollTop(this.selectedIndex);
        if (target === null) return;
        this.writeScroll(target);
      });
    });
  }

  private cancelAlignment(): void {
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private refreshGeometry(): void {
    if (!this.geometryDirty) return;
    const element = this.scroller?.nativeElement;
    if (!element?.clientHeight) return;
    this.maximumScroll = Math.max(0, element.scrollHeight - element.clientHeight);
    const viewport = element.getBoundingClientRect();
    const scrollTop = element.scrollTop;
    this.gapOffsets = Array.from(element.querySelectorAll<HTMLElement>('.insertion-gap'))
      .map(gap => {
        const bounds = gap.getBoundingClientRect();
        return Math.max(0, Math.min(this.maximumScroll, bounds.top + bounds.height / 2 - viewport.top + scrollTop - element.clientHeight / 2));
      });
    this.geometryDirty = false;
  }

  private targetScrollTop(index: number): number | null {
    this.refreshGeometry();
    return this.gapOffsets[index] ?? null;
  }

  private updateSelection(): void {
    this.selectIndex(this.nearestGapIndex(this.scroller.nativeElement.scrollTop));
  }

  private nearestGapIndex(top: number): number {
    this.refreshGeometry();
    if (!this.gapOffsets.length) return this.selectedIndex;
    let low = 0;
    let high = this.gapOffsets.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.gapOffsets[middle] < top) low = middle + 1;
      else high = middle;
    }
    const previous = Math.max(0, low - 1);
    return Math.abs(this.gapOffsets[low] - top) < Math.abs(this.gapOffsets[previous] - top) ? low : previous;
  }

  private selectIndex(index: number): void {
    this.selectedIndex = index;
    if (this.selectedIndex !== this.emittedSelection) {
      this.emittedSelection = this.selectedIndex;
      this.zone.run(() => this.selectionChange.emit(this.selectedIndex));
    }
  }

  private clearSettleTimer(): void {
    if (this.settleTimer !== null) window.clearTimeout(this.settleTimer);
    this.settleTimer = null;
  }

  private listen(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions): void {
    target.addEventListener(type, listener, options);
    this.listenerCleanup.push(() => target.removeEventListener(type, listener, options));
  }
}
