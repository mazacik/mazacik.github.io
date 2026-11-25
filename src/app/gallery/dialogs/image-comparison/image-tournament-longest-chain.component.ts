import { Component, ElementRef, HostListener, Input, NgZone, afterRenderEffect, effect, viewChild } from '@angular/core';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';
import { RankedImageSrcDirective } from './ranked-image-src.directive';

@Component({
  selector: 'app-image-tournament-longest-chain',
  imports: [RankedImageSrcDirective],
  host: { '[class.horizontal]': 'horizontal' },
  templateUrl: './image-tournament-longest-chain.component.html',
  styleUrls: ['./image-tournament-longest-chain.component.scss']
})
export class ImageTournamentLongestChainComponent {
  @Input() public showOnlyFilteredImages: boolean = false;
  private readonly mainRow = viewChild<ElementRef<HTMLElement>>('mainRow');
  private readonly navigator = viewChild<ElementRef<HTMLElement>>('navigator');
  private readonly horizontalLayout = window.matchMedia('(width > 1280px), (orientation: landscape)');
  protected horizontal = this.horizontalLayout.matches;
  private follower?: HTMLElement;
  private mirroredLeft = 0;
  private frame = 0;
  private destinationIndex = 0;
  private wheelTarget?: { left: number; direction: number };

  protected rankedImages: GalleryImage[] = [];

  constructor(
    protected applicationService: ApplicationService,
    private serializationService: GallerySerializationService,
    protected stateService: GalleryStateService,
    private zone: NgZone
  ) {
    effect(() => {
      this.stateService.imageSort.stateVersion();
      this.refresh();
    });
    afterRenderEffect(onCleanup => {
      const row = this.mainRow()?.nativeElement;
      const nav = this.navigator()?.nativeElement;
      if (!row) return;
      const listeners = new AbortController();
      zone.runOutsideAngular(() => {
        const reveal = (event: Event) => {
          const image = event.target;
          if (!(image instanceof HTMLImageElement)) return;
          const src = image.src;
          image.decode().then(() => {
            if (image.src === src) image.classList.add('loaded');
          }).catch(() => undefined);
        };
        row.addEventListener('load', reveal, { capture: true, signal: listeners.signal });
        if (!nav) return;
        nav.addEventListener('load', reveal, { capture: true, signal: listeners.signal });
        for (const [source, target] of [[row, nav], [nav, row]]) {
          const options = { signal: listeners.signal };
          source.addEventListener('scroll', () => this.syncRows(source, target), options);
          for (const event of ['pointerdown', 'keydown']) {
            source.addEventListener(event, () => {
              this.stopMotion();
              this.driveWith(source, target);
            }, options);
          }
          source.addEventListener('wheel', event => {
            if (event.ctrlKey || event.metaKey) return;
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (!delta) return;
            event.preventDefault();
            const unit = event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? source.clientWidth :
              event.deltaMode === WheelEvent.DOM_DELTA_LINE ? parseFloat(getComputedStyle(source).fontSize) : 1;
            this.driveWith(source, target);
            this.scrollWithWheel(source, target, delta * unit * (source === row ? 3 : 0.5));
          }, { ...options, passive: false });
        }
      });
      onCleanup(() => {
        listeners.abort();
        this.stopMotion();
        this.follower?.classList.remove('following-scroll');
        this.follower = undefined;
      });
    });
  }

  @HostListener('window:resize')
  protected updateLayout(): void {
    this.horizontal = this.horizontalLayout.matches;
  }

  public scrollToSubject(subjectId: string): void {
    const row = this.mainRow()?.nativeElement;
    const images = this.visibleRankedImages;
    const index = images.findIndex(image => GallerySortUtils.getSortSubjectId(image) === subjectId);
    if (!row || index < 0) return;
    if (this.navigator()) {
      this.centerImage(row, index, 'instant');
    } else {
      row.children[index].scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }

  protected centerImage(row: HTMLElement, index: number, behavior: ScrollBehavior = 'smooth'): void {
    const nav = this.navigator().nativeElement;
    this.stopMotion();
    this.driveWith(row, nav);
    this.animateTo(row, nav, index, behavior);
  }

  private centerOffset(row: HTMLElement, index: number): number {
    const item = row.children[index].getBoundingClientRect();
    return row.scrollLeft + item.left - row.getBoundingClientRect().left + (item.width - row.clientWidth) / 2;
  }

  private driveWith(source: HTMLElement, target: HTMLElement): void {
    if (this.follower === target) return;
    this.stopMotion();
    source.classList.remove('following-scroll');
    target.classList.add('following-scroll');
    this.follower = target;
    this.mirroredLeft = target.scrollLeft;
  }

  private syncRows(source: HTMLElement, target: HTMLElement): void {
    if (source === this.follower && Math.abs(source.scrollLeft - this.mirroredLeft) < 1) return;
    this.driveWith(source, target);
    if (!source.clientWidth || !source.children.length) return;
    // Equal gaps occupy a different fraction of each row. Match progress between image centers.
    const upper = this.firstCenterAtOrAfter(source, source.scrollLeft);
    const lower = Math.max(0, upper - 1);
    const start = this.centerOffset(source, lower);
    const end = this.centerOffset(source, upper);
    const left = source.scrollLeft;
    const fraction = end === start || left <= start + 0.5 ? 0 : left >= end - 0.5 ? 1 : (left - start) / (end - start);
    const targetStart = this.centerOffset(target, lower);
    target.scrollTo({ left: targetStart + fraction * (this.centerOffset(target, upper) - targetStart), behavior: 'instant' });
    this.mirroredLeft = target.scrollLeft;
  }

  private firstCenterAtOrAfter(row: HTMLElement, left: number): number {
    let low = 0;
    let high = row.children.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.centerOffset(row, mid) < left) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  private scrollWithWheel(row: HTMLElement, target: HTMLElement, delta: number): void {
    // Keep the unsnapped distance so a burst of wheel input can cross several images.
    const direction = Math.sign(delta);
    const previous = this.wheelTarget;
    const from = previous?.direction === direction
      ? previous.left : row.scrollLeft;
    const left = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, from + delta));
    let index = this.firstCenterAtOrAfter(row, left);
    if (direction < 0 && index > 0 && this.centerOffset(row, index) > left) index--;
    this.wheelTarget = { left, direction };
    this.animateTo(row, target, index);
  }

  private animateTo(row: HTMLElement, target: HTMLElement, index: number, behavior: ScrollBehavior = 'smooth'): void {
    this.destinationIndex = index;
    if (this.frame) return;
    row.classList.add('moving');
    const instant = behavior === 'instant' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    let previous = performance.now();
    const advance = (time: number) => {
      const index = Math.min(this.destinationIndex, row.children.length - 1);
      if (index < 0 || !row.clientWidth) return this.stopMotion();
      const left = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, this.centerOffset(row, index)));
      const remaining = left - row.scrollLeft;
      const step = Math.max(1, Math.abs(remaining) * (1 - Math.exp(-Math.max(1, time - previous) / 65)));
      previous = time;
      const done = instant || Math.abs(remaining) <= Math.max(step, 1.5);
      row.scrollTo({ left: done ? left : row.scrollLeft + Math.sign(remaining) * step, behavior: 'instant' });
      this.syncRows(row, target);
      if (done) this.stopMotion();
      else this.frame = requestAnimationFrame(advance);
    };
    if (instant) advance(previous);
    else this.zone.runOutsideAngular(() => this.frame = requestAnimationFrame(advance));
  }

  private stopMotion(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.mainRow()?.nativeElement.classList.remove('moving');
    this.navigator()?.nativeElement.classList.remove('moving');
    this.wheelTarget = undefined;
  }

  private refresh(): void {
    this.rankedImages = this.stateService.imageSort.rankedImageIds.map(id => GallerySortUtils.resolveSubjectImage(id, this.stateService.images, this.stateService.imageGroups)).filter(Boolean);
  }

  protected get visibleRankedImages(): GalleryImage[] {
    if (!this.showOnlyFilteredImages) return this.rankedImages;

    return this.rankedImages.map(GallerySortUtils.getMatchingRepresentative).filter(Boolean);
  }

  protected openFullscreen(image: GalleryImage): void {
    if (!image) return;
    this.stateService.fullscreenImage.set(image);
  }

  protected moveImageToPending(image: GalleryImage, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!image) return;

    this.stateService.imageSort.moveRankedImageToPending(GallerySortUtils.getSortSubjectId(image));
    this.stateService.sortState = this.stateService.imageSort.getState();
    this.serializationService.save(true);
  }

  protected canMoveRankedImage(image: GalleryImage, direction: -1 | 1): boolean {
    const boundary = this.stateService.imageSort.rankedImageIds.at(direction === -1 ? 0 : -1);
    return GallerySortUtils.getSortSubjectId(image) !== boundary;
  }

  protected moveRankedImage(image: GalleryImage, direction: -1 | 1, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!image) return;

    if (this.stateService.imageSort.swapRankedImage(GallerySortUtils.getSortSubjectId(image), direction)) {
      this.stateService.sortState = this.stateService.imageSort.getState();
      this.serializationService.save(true);
    }
  }

}
