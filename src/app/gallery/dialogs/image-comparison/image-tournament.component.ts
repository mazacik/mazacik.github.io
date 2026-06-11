import { Component, OnDestroy, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { GalleryUtils } from '../../../shared/utils/gallery.utils';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';

@Component({
  selector: 'app-image-tournament',
  imports: [ImageComponent],
  templateUrl: './image-tournament.component.html',
  styleUrls: ['./image-tournament.component.scss']
})
export class ImageTournamentComponent implements OnDestroy {
  protected readonly galleryUtils = GalleryUtils;

  protected comparison: [GalleryImage, GalleryImage] = null;
  protected winnersRight: GalleryImage[] = [];
  protected losersRight: GalleryImage[] = [];
  protected comparisonImagesReady: [boolean, boolean] = [false, false];
  private comparisonImageIds: [string, string] | null = null;
  private longPressTimer: number | null = null;
  private suppressNextClick: boolean = false;
  private readonly longPressDelayMs: number = 500;

  constructor(
    private serializationService: GallerySerializationService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.stateService.imageSort.stateVersion();
      this.refreshComparisonRelations();
    });
  }

  ngOnDestroy(): void {
    this.clearLongPressTimer();
  }

  protected get sortStatus(): string {
    const ranked = this.stateService.imageSort.rankedImageIds.length;
    const total = ranked + this.stateService.imageSort.pendingCountIncludingActive;
    return `${ranked}/${total}`;
  }

  protected get rangeStartPlacementPercent(): number | null {
    return this.getInsertionPlacementPercent(this.stateService.imageSort.activeInsertion?.low);
  }

  protected get rangeEndPlacementPercent(): number | null {
    return this.getInsertionPlacementPercent(this.stateService.imageSort.activeInsertion?.high);
  }

  protected get sortProgressPercent(): number {
    const ranked = this.stateService.imageSort.rankedImageIds.length;
    const total = ranked + this.stateService.imageSort.pendingCountIncludingActive;
    if (total <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (ranked / total) * 100));
  }

  protected get showPlacementRange(): boolean {
    return this.rangeStartPlacementPercent !== null && this.rangeEndPlacementPercent !== null;
  }

  protected get rangeEndOffsetPercent(): number {
    if (this.rangeStartPlacementPercent === null || this.rangeEndPlacementPercent === null) {
      return 0;
    }

    return Math.max(0, 100 - this.rangeEndPlacementPercent);
  }

  protected onImageClick(winner: GalleryImage): void {
    if (this.suppressNextClick || !this.canChooseImages()) {
      this.suppressNextClick = false;
      return;
    }

    this.stateService.imageSort.answer(GallerySortUtils.getSortSubjectId(winner));
    this.persistSortState();
    this.refreshComparisonRelations();
  }

  public onEnterTournament(): void {
    const before = JSON.stringify(this.stateService.sortState ?? null);
    this.stateService.imageSort.start(this.getSortableSubjectIds(), this.stateService.sortState);
    this.stateService.sortState = this.stateService.imageSort.getState();
    if (JSON.stringify(this.stateService.sortState) !== before) {
      this.serializationService.save(true);
    }
    this.refreshComparisonRelations();
  }

  public resetActiveImage(): void {
    this.stateService.imageSort.resetActiveInsertion();
    this.persistSortState();
    this.refreshComparisonRelations();
  }

  protected restartActiveImageComparisons(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearLongPressTimer();
    this.resetActiveImage();
  }

  protected skipActiveImage(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearLongPressTimer();
    this.stateService.imageSort.skipActiveInsertion();
    this.persistSortState();
    this.refreshComparisonRelations();
  }

  public resetSort(): void {
    this.stateService.sortState = null;
    this.stateService.imageSort.start(this.getSortableSubjectIds(), null);
    this.persistSortState();
    this.refreshComparisonRelations();
  }

  protected onImageContextMenu(image: GalleryImage, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.openFullscreen(image);
  }

  protected onImageTouchStart(image: GalleryImage): void {
    if (!image) return;
    this.clearLongPressTimer();
    this.longPressTimer = window.setTimeout(() => {
      this.suppressNextClick = true;
      this.openFullscreen(image);
    }, this.longPressDelayMs);
  }

  protected onImageTouchEnd(): void {
    this.clearLongPressTimer();
  }

  protected onImageTouchMove(): void {
    this.clearLongPressTimer();
  }

  protected onComparisonImageDisplayed(index: 0 | 1, image: GalleryImage, displayedSrc: string): void {
    if (!this.comparisonImageIds || this.comparisonImageIds[index] !== GallerySortUtils.getSortSubjectId(image)) {
      return;
    }

    if (displayedSrc !== image.contentLink && displayedSrc !== this.galleryUtils.getPlaceholderSrc(image)) {
      return;
    }

    this.comparisonImagesReady[index] = true;
  }

  protected openRelationFullscreen(image: GalleryImage, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }

    this.openFullscreen(image);
  }

  protected openFullscreen(image: GalleryImage): void {
    if (!image) return;
    this.stateService.fullscreenImage.set(image);
  }

  protected hasGroupNavigation(image: GalleryImage): boolean {
    return (image?.group?.images.length ?? 0) > 1;
  }

  protected showPreviousGroupImage(index: 0 | 1, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.setComparisonImage(index, this.getSiblingGroupImage(this.comparison[index], -1));
  }

  protected showNextGroupImage(index: 0 | 1, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.setComparisonImage(index, this.getSiblingGroupImage(this.comparison[index], 1));
  }

  protected canCompareAgainst(image: GalleryImage): boolean {
    return this.stateService.imageSort.canCompareAgainstRankedImage(GallerySortUtils.getSortSubjectId(image));
  }

  protected compareAgainst(image: GalleryImage, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearLongPressTimer();
    if (this.stateService.imageSort.setComparisonOpponent(GallerySortUtils.getSortSubjectId(image))) {
      this.refreshComparisonRelations();
    }
  }

  public refreshComparisonRelations(): void {
    this.comparison = this.getCurrentComparison();
    this.updateComparisonImageReadiness();
    if (this.comparison && this.stateService.settings?.showComparisonRelations) {
      const rightOverlay = this.stateService.imageSort.getOverlayIds(GallerySortUtils.getSortSubjectId(this.comparison[1]));
      this.winnersRight = this.resolveImages([...rightOverlay.winners].reverse());
      this.losersRight = this.resolveImages(rightOverlay.losers);
      return;
    }

    this.winnersRight = [];
    this.losersRight = [];
  }

  private getCurrentComparison(): [GalleryImage, GalleryImage] {
    const comparisonIds = this.stateService.imageSort.currentComparisonIds;
    if (!comparisonIds) {
      return null;
    }

    const activeImage = GallerySortUtils.resolveSubjectImage(comparisonIds[0], this.stateService.images, this.stateService.imageGroups);
    const opponentImage = GallerySortUtils.resolveSubjectImage(comparisonIds[1], this.stateService.images, this.stateService.imageGroups);
    return activeImage && opponentImage ? [activeImage, opponentImage] : null;
  }

  protected canChooseImages(): boolean {
    return this.comparisonImagesReady[0] && this.comparisonImagesReady[1];
  }

  private updateComparisonImageReadiness(): void {
    const nextComparisonImageIds: [string, string] | null = this.comparison
      ? [
        GallerySortUtils.getSortSubjectId(this.comparison[0]),
        GallerySortUtils.getSortSubjectId(this.comparison[1])
      ]
      : null;

    if (
      this.comparisonImageIds?.[0] === nextComparisonImageIds?.[0]
      && this.comparisonImageIds?.[1] === nextComparisonImageIds?.[1]
    ) {
      return;
    }

    const previousComparisonImageIds = this.comparisonImageIds;
    const previousComparisonImagesReady = this.comparisonImagesReady;
    this.comparisonImageIds = nextComparisonImageIds;
    this.comparisonImagesReady = nextComparisonImageIds
      ? [
        previousComparisonImageIds?.[0] === nextComparisonImageIds[0] && previousComparisonImagesReady[0],
        previousComparisonImageIds?.[1] === nextComparisonImageIds[1] && previousComparisonImagesReady[1]
      ]
      : [false, false];
  }

  private resolveImages(imageIds: string[]): GalleryImage[] {
    return imageIds.map(id => GallerySortUtils.resolveSubjectImage(id, this.stateService.images, this.stateService.imageGroups)).filter(Boolean);
  }

  private getInsertionPlacementPercent(position: number | undefined): number | null {
    const rankedCount = this.stateService.imageSort.rankedImageIds.length;
    if (position === undefined || rankedCount <= 0) {
      return null;
    }

    return Math.max(0, Math.min(100, (position / rankedCount) * 100));
  }

  private getSortableSubjectIds(): string[] {
    return GallerySortUtils.getSortableSubjectIds(this.stateService.images, this.stateService.imageGroups);
  }

  private getSiblingGroupImage(image: GalleryImage, offset: number): GalleryImage {
    const groupImages = image?.group?.images ?? [];
    if (groupImages.length <= 1) {
      return image;
    }

    const currentIndex = Math.max(0, groupImages.indexOf(image));
    const nextIndex = (currentIndex + offset + groupImages.length) % groupImages.length;
    return groupImages[nextIndex];
  }

  private setComparisonImage(index: 0 | 1, image: GalleryImage): void {
    if (!this.comparison || !image) {
      return;
    }

    this.comparison = index === 0 ? [image, this.comparison[1]] : [this.comparison[0], image];
  }

  private persistSortState(): void {
    this.stateService.sortState = this.stateService.imageSort.getState();
    this.serializationService.save(true);
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer === null) return;
    window.clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

}
