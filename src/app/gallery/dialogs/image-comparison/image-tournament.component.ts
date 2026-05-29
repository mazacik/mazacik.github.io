import { Component, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { GalleryUtils } from '../../../shared/utils/gallery.utils';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
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

    this.stateService.imageSort.answer(winner.id);
    this.persistSortState();
    this.refreshComparisonRelations();
  }

  public onEnterTournament(): void {
    const before = JSON.stringify(this.stateService.sortState ?? null);
    this.stateService.imageSort.start(this.getSortableImageIds(), this.stateService.sortState);
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

  public toggleRelations(): void {
    this.stateService.settings.showComparisonRelations = !this.stateService.settings.showComparisonRelations;
    this.serializationService.save();
    this.refreshComparisonRelations();
  }

  public resetSort(): void {
    this.stateService.sortState = null;
    this.stateService.imageSort.start(this.getSortableImageIds(), null);
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

  public refreshComparisonRelations(): void {
    this.comparison = this.getCurrentComparison();
    if (this.comparison && this.stateService.settings?.showComparisonRelations) {
      const leftOverlay = this.stateService.imageSort.getOverlayIds(this.comparison[0].id);
      const rightOverlay = this.stateService.imageSort.getOverlayIds(this.comparison[1].id);
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

    const imageById = this.getImageByIdMap();
    const activeImage = imageById.get(comparisonIds[0]);
    const opponentImage = imageById.get(comparisonIds[1]);
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
    const imageById = this.getImageByIdMap();
    return imageIds.map(id => imageById.get(id)).filter(Boolean);
  }

  private getImageByIdMap(): Map<string, GalleryImage> {
    return new Map(this.stateService.images.map(image => [image.id, image]));
  }

  private getSortableImageIds(): string[] {
    return this.stateService.images.filter(image => GoogleFileUtils.isImage(image)).map(image => image.id);
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
