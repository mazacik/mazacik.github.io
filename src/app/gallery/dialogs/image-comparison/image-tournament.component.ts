import { Component, ElementRef, HostListener, OnDestroy, ViewChild, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { GalleryUtils } from '../../../shared/utils/gallery.utils';
import { DialogService } from '../../../shared/services/dialog.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';
import { GalleryFeatures } from '../../constants/gallery-features';
import { ImageRankingConsistencyCheck, ImageRankingConsistencyUtils } from './image-ranking-consistency.utils';
import { ImageRankingRowComponent, RankedRowPlacement, RankedRowSubject } from './image-ranking-row.component';

@Component({
  selector: 'app-image-tournament',
  imports: [ImageComponent, ImageRankingRowComponent],
  templateUrl: './image-tournament.component.html',
  styleUrls: ['./image-tournament.component.scss']
})
export class ImageTournamentComponent implements OnDestroy {
  protected readonly galleryUtils = GalleryUtils;

  @ViewChild('comparisonContainer')
  private comparisonContainer?: ElementRef<HTMLElement>;

  @ViewChild(ImageRankingRowComponent)
  private rankingRow?: ImageRankingRowComponent;

  protected rowActiveImage: GalleryImage | null = null;
  protected rankedSubjects: RankedRowSubject[] = [];
  protected selectedPlacementIndex = 0;
  private desktopRowAvailable = window.innerWidth >= 1024;

  protected comparison: [GalleryImage, GalleryImage] = null;
  protected winnersRight: GalleryImage[] = [];
  protected losersRight: GalleryImage[] = [];
  protected comparisonImagesReady: [boolean, boolean] = [false, false];
  protected mobileComparisonIndex: 0 | 1 = 0;
  private comparisonImageIds: [string, string] | null = null;
  private longPressTimer: number | null = null;
  private suppressNextClick: boolean = false;
  private consistencyCheck: ImageRankingConsistencyCheck | null = null;
  private consistencyWarningOpen: boolean = false;
  private readonly longPressDelayMs: number = 500;
  private readonly mobileComparisonMediaQuery: string = '(max-width: 799px) and (orientation: portrait)';

  constructor(
    private dialogService: DialogService,
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

  public get isRankedRowMode(): boolean {
    return GalleryFeatures.rankedColumnPlacement && this.desktopRowAvailable && !!this.stateService.settings?.useRankedRow;
  }

  public setRankedRowMode(enabled: boolean): void {
    if (!GalleryFeatures.rankedColumnPlacement) return;
    this.stateService.settings.useRankedRow = enabled;
    this.serializationService.save();
    if (this.isRankedRowMode) this.clearConsistencyCheck();
    this.refreshComparisonRelations();
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    const available = window.innerWidth >= 1024;
    if (available === this.desktopRowAvailable) return;
    this.desktopRowAvailable = available;
    if (this.isRankedRowMode) this.clearConsistencyCheck();
    this.refreshComparisonRelations();
  }

  protected placeInRankedRow(placement: RankedRowPlacement): void {
    if (!this.isRankedRowMode || !this.stateService.imageSort.placeActiveInsertion(placement.subjectId, placement.index)) return;
    this.clearConsistencyCheck();
    this.persistSortState();
    this.refreshComparisonRelations();
  }

  protected get sortStatus(): string {
    const ranked = this.stateService.imageSort.rankedImageIds.length;
    const total = ranked + this.stateService.imageSort.pendingCountIncludingActive;
    return `${ranked}/${total}`;
  }

  protected get rangeStartPlacementPercent(): number | null {
    if (this.isRankedRowMode) return this.rowActiveImage ? this.getInsertionPlacementPercent(this.selectedPlacementIndex) : null;
    return this.getInsertionPlacementPercent(this.stateService.imageSort.activeInsertion?.low);
  }

  protected get rangeEndPlacementPercent(): number | null {
    if (this.isRankedRowMode) return this.rangeStartPlacementPercent;
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

  protected async onImageClick(winner: GalleryImage): Promise<void> {
    if (this.suppressNextClick || !this.canChooseImages()) {
      this.suppressNextClick = false;
      return;
    }

    const winnerSubjectId = GallerySortUtils.getSortSubjectId(winner);
    if (this.consistencyCheck) {
      await this.answerConsistencyCheck(winnerSubjectId);
      return;
    }

    const rankedCountBefore = this.stateService.imageSort.rankedImageIds.length;
    this.stateService.imageSort.answer(winnerSubjectId);
    this.persistSortState();
    this.startConsistencyCheckAfterInsertion(rankedCountBefore);
    this.refreshComparisonRelations();
  }

  protected async onComparisonImageClick(image: GalleryImage): Promise<void> {
    if (!this.isMobileComparisonLayout()) {
      await this.onImageClick(image);
      return;
    }

    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }

    this.openFullscreen(image);
  }

  protected onComparisonScroll(element: HTMLElement): void {
    if (this.isMobileComparisonLayout()) {
      this.mobileComparisonIndex = this.getClosestComparisonIndex(element);
    }
  }

  protected async chooseCurrentComparisonImage(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.comparison) {
      return;
    }

    const comparisonElement = this.comparisonContainer?.nativeElement;
    if (comparisonElement) {
      this.mobileComparisonIndex = this.getClosestComparisonIndex(comparisonElement);
    }

    await this.onImageClick(this.comparison[this.mobileComparisonIndex]);
  }

  protected showMobileComparisonPage(index: 0 | 1, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearLongPressTimer();
    const comparisonElement = this.comparisonContainer?.nativeElement;
    const columns = Array.from(comparisonElement?.querySelectorAll<HTMLElement>(':scope > .comparison-column') ?? []);
    if (!comparisonElement || columns.length < 2) {
      return;
    }

    this.mobileComparisonIndex = index;
    comparisonElement.scrollTo({
      top: columns[index].offsetTop - columns[0].offsetTop,
      behavior: 'smooth'
    });
  }

  public onEnterTournament(): void {
    this.resetMobileComparisonPage();
    this.clearConsistencyCheck();
    const before = JSON.stringify(this.stateService.sortState ?? null);
    this.stateService.imageSort.start(this.getSortableSubjectIds(), this.stateService.sortState);
    this.stateService.sortState = this.stateService.imageSort.getState();
    if (JSON.stringify(this.stateService.sortState) !== before) {
      this.serializationService.save(true);
    }
    this.refreshComparisonRelations();
    this.rankingRow?.resetPosition();
  }

  public resetActiveImage(): void {
    this.clearConsistencyCheck();
    this.stateService.imageSort.resetActiveInsertion();
    this.persistSortState();
    this.refreshComparisonRelations();
    this.rankingRow?.resetPosition();
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
    this.clearConsistencyCheck();
    this.stateService.imageSort.skipActiveInsertion();
    this.persistSortState();
    this.refreshComparisonRelations();
  }

  public resetSort(): void {
    this.resetMobileComparisonPage();
    this.clearConsistencyCheck();
    this.stateService.sortState = null;
    this.stateService.imageSort.start(this.getSortableSubjectIds(), null);
    this.persistSortState();
    this.refreshComparisonRelations();
    this.rankingRow?.resetPosition();
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

  protected compareAgainst(image: GalleryImage, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearLongPressTimer();
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    if (this.stateService.imageSort.setComparisonOpponent(GallerySortUtils.getSortSubjectId(image))) {
      this.refreshComparisonRelations();
    }
  }

  public refreshComparisonRelations(): void {
    this.clearInvalidConsistencyCheck();
    const activeId = this.stateService.imageSort.activeInsertion?.imageId;
    this.rowActiveImage = activeId ? GallerySortUtils.resolveSubjectImage(activeId, this.stateService.images, this.stateService.imageGroups) : null;
    const rankedIds = this.stateService.imageSort.rankedImageIds;
    if (this.isRankedRowMode) {
      const subjects = rankedIds.map(id => ({ id, image: GallerySortUtils.resolveSubjectImage(id, this.stateService.images, this.stateService.imageGroups) ?? null }));
      if (subjects.length !== this.rankedSubjects.length || subjects.some((subject, index) => subject.id !== this.rankedSubjects[index].id || subject.image !== this.rankedSubjects[index].image)) {
        this.rankedSubjects = subjects;
      }
    }
    this.comparison = this.getCurrentComparison();
    this.updateComparisonImageReadiness();
    if (!this.isRankedRowMode && this.comparison && !this.consistencyCheck && this.stateService.settings?.showComparisonRelations) {
      const rightOverlay = this.stateService.imageSort.getOverlayIds(GallerySortUtils.getSortSubjectId(this.comparison[1]));
      this.winnersRight = this.resolveImages([...rightOverlay.winners].reverse());
      this.losersRight = this.resolveImages(rightOverlay.losers);
      return;
    }

    this.winnersRight = [];
    this.losersRight = [];
  }

  private getCurrentComparison(): [GalleryImage, GalleryImage] {
    const comparisonIds = this.consistencyCheck?.comparisonSubjectIds ?? this.stateService.imageSort.currentComparisonIds;
    if (!comparisonIds) {
      return null;
    }

    const activeImage = GallerySortUtils.resolveSubjectImage(comparisonIds[0], this.stateService.images, this.stateService.imageGroups);
    const opponentImage = GallerySortUtils.resolveSubjectImage(comparisonIds[1], this.stateService.images, this.stateService.imageGroups);
    return activeImage && opponentImage ? [activeImage, opponentImage] : null;
  }

  private isMobileComparisonLayout(): boolean {
    return window.matchMedia(this.mobileComparisonMediaQuery).matches;
  }

  private getClosestComparisonIndex(element: HTMLElement): 0 | 1 {
    const columns = Array.from(element.querySelectorAll<HTMLElement>(':scope > .comparison-column'));
    if (columns.length < 2) {
      return 0;
    }

    const firstPageTop = 0;
    const secondPageTop = columns[1].offsetTop - columns[0].offsetTop;
    const firstDistance = Math.abs(element.scrollTop - firstPageTop);
    const secondDistance = Math.abs(element.scrollTop - secondPageTop);
    return secondDistance < firstDistance ? 1 : 0;
  }

  private resetMobileComparisonPage(): void {
    this.mobileComparisonIndex = 0;
    if (this.comparisonContainer) {
      this.comparisonContainer.nativeElement.scrollTop = 0;
    }
  }

  protected canChooseImages(): boolean {
    return !this.consistencyWarningOpen && this.comparisonImagesReady[0] && this.comparisonImagesReady[1];
  }

  protected get isConsistencyCheckActive(): boolean {
    return !!this.consistencyCheck;
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

  private startConsistencyCheckAfterInsertion(rankedCountBefore: number): void {
    const rankedSubjectIds = this.stateService.imageSort.rankedImageIds;
    if (rankedSubjectIds.length <= rankedCountBefore || rankedSubjectIds.length < 10) {
      return;
    }

    this.consistencyCheck = ImageRankingConsistencyUtils.createCheck(rankedSubjectIds);
  }

  private async answerConsistencyCheck(winnerSubjectId: string): Promise<void> {
    const consistencyCheck = this.consistencyCheck;
    if (!consistencyCheck || !consistencyCheck.comparisonSubjectIds.includes(winnerSubjectId)) {
      return;
    }

    if (winnerSubjectId === consistencyCheck.higherRankedSubjectId) {
      this.clearConsistencyCheck();
      this.refreshComparisonRelations();
      return;
    }

    this.consistencyWarningOpen = true;
    try {
      await this.dialogService.createMessage({
        title: 'Ranking Consistency Warning',
        messages: ['You chose the lower-ranked image.'],
        hideCloseButton: true
      });
    } finally {
      this.clearConsistencyCheck();
      this.refreshComparisonRelations();
    }
  }

  private clearInvalidConsistencyCheck(): void {
    if (!this.consistencyCheck) {
      return;
    }

    const rankedSubjectIds = this.stateService.imageSort.rankedImageIds;
    if (this.consistencyCheck.comparisonSubjectIds.some(subjectId => !rankedSubjectIds.includes(subjectId))) {
      this.clearConsistencyCheck();
    }
  }

  private clearConsistencyCheck(): void {
    this.consistencyCheck = null;
    this.consistencyWarningOpen = false;
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer === null) return;
    window.clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

}
