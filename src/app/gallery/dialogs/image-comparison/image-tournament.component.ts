import { Component, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GalleryUtils } from '../../../shared/utils/gallery.utils';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';
import { ComparisonPathComponent } from '../comparison-path/comparison-path.component';

@Component({
  selector: 'app-image-tournament',
  imports: [ImageComponent],
  templateUrl: './image-tournament.component.html',
  styleUrls: ['./image-tournament.component.scss']
})
export class ImageTournamentComponent {
  protected readonly galleryUtils = GalleryUtils;

  protected comparison: [GalleryImage, GalleryImage] = null;
  protected winnersLeft: GalleryImage[] = [];
  protected losersLeft: GalleryImage[] = [];
  protected winnersRight: GalleryImage[] = [];
  protected losersRight: GalleryImage[] = [];
  private longPressTimer: number | null = null;
  private suppressNextClick: boolean = false;
  private readonly longPressDelayMs: number = 500;

  constructor(
    private serializationService: GallerySerializationService,
    private dialogService: DialogService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.stateService.imageSort.stateVersion();
      this.refreshComparisonRelations();
    });
  }

  protected get sortStatus(): string {
    const ranked = this.stateService.imageSort.rankedImageIds.length;
    const pending = this.stateService.imageSort.pendingCountIncludingActive;
    const interval = this.stateService.imageSort.currentIntervalSize;
    if (interval > 0) {
      return `ranked: ${ranked}, pending: ${pending}, placement window: ${interval}`;
    }

    return `ranked: ${ranked}, pending: ${pending}, placement window: ${interval}`;
  }

  protected onImageClick(winner: GalleryImage): void {
    if (this.suppressNextClick) {
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

  protected openComparisonPath(start: GalleryImage, end: GalleryImage): void {
    if (!start || !end) return;
    this.dialogService.create(ComparisonPathComponent, { start, end });
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

  public refreshComparisonRelations(): void {
    this.comparison = this.getCurrentComparison();
    if (this.comparison && this.stateService.settings?.showComparisonRelations) {
      const leftOverlay = this.stateService.imageSort.getOverlayIds(GallerySortUtils.getSortSubjectId(this.comparison[0]));
      const rightOverlay = this.stateService.imageSort.getOverlayIds(GallerySortUtils.getSortSubjectId(this.comparison[1]));
      this.winnersLeft = this.resolveImages(leftOverlay.winners);
      this.losersLeft = this.resolveImages(leftOverlay.losers);
      this.winnersRight = this.resolveImages(rightOverlay.winners);
      this.losersRight = this.resolveImages(rightOverlay.losers);
      this.filterSharedComparisonRelations();
      return;
    }

    this.winnersLeft = [];
    this.losersLeft = [];
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

  private filterSharedComparisonRelations(): void {
    if (!this.stateService.settings?.hideComparisonSharedRelations) {
      return;
    }

    const sharedWinnerIds = this.collectSharedIds(this.winnersLeft, this.winnersRight);
    if (sharedWinnerIds.size) {
      this.winnersLeft = this.winnersLeft.filter(image => !sharedWinnerIds.has(image.id));
      this.winnersRight = this.winnersRight.filter(image => !sharedWinnerIds.has(image.id));
    }

    const sharedLoserIds = this.collectSharedIds(this.losersLeft, this.losersRight);
    if (sharedLoserIds.size) {
      this.losersLeft = this.losersLeft.filter(image => !sharedLoserIds.has(image.id));
      this.losersRight = this.losersRight.filter(image => !sharedLoserIds.has(image.id));
    }
  }

  private collectSharedIds(left: GalleryImage[], right: GalleryImage[]): Set<string> {
    if (!left.length || !right.length) return new Set();
    const leftIds = new Set(left.map(image => image.id));
    const shared = new Set<string>();
    right.forEach(image => {
      if (leftIds.has(image.id)) {
        shared.add(image.id);
      }
    });
    return shared;
  }

  private resolveImages(imageIds: string[]): GalleryImage[] {
    return imageIds.map(id => GallerySortUtils.resolveSubjectImage(id, this.stateService.images, this.stateService.imageGroups)).filter(Boolean);
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
