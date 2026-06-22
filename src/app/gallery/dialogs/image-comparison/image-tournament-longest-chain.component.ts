import { Component, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';

@Component({
  selector: 'app-image-tournament-longest-chain',
  imports: [],
  templateUrl: './image-tournament-longest-chain.component.html',
  styleUrls: ['./image-tournament-longest-chain.component.scss']
})
export class ImageTournamentLongestChainComponent {
  protected rankedImages: GalleryImage[] = [];
  protected activeRankingControlsImageId: string | null = null;

  constructor(
    private serializationService: GallerySerializationService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.stateService.imageSort.stateVersion();
      this.refresh();
    });
  }

  private refresh(): void {
    this.rankedImages = this.stateService.imageSort.rankedImageIds.map(id => GallerySortUtils.resolveSubjectImage(id, this.stateService.images, this.stateService.imageGroups)).filter(Boolean);
  }

  protected openFullscreen(image: GalleryImage): void {
    if (!image) return;
    this.stateService.fullscreenImage.set(image);
  }

  protected onImageClick(image: GalleryImage, event: MouseEvent): void {
    if (!ScreenUtils.isLargeScreen() && !this.isRankingControlsActive(image)) {
      event.preventDefault();
      event.stopPropagation();
      this.activateRankingControls(image);
      return;
    }

    this.openFullscreen(image);
  }

  protected activateRankingControls(image: GalleryImage): void {
    this.activeRankingControlsImageId = GallerySortUtils.getSortSubjectId(image);
  }

  protected isRankingControlsActive(image: GalleryImage): boolean {
    return this.activeRankingControlsImageId === GallerySortUtils.getSortSubjectId(image);
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
    const index = this.getRankedImageIndex(image);
    const nextIndex = index + direction;
    return index !== -1 && nextIndex >= 0 && nextIndex < this.rankedImages.length;
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

  private getRankedImageIndex(image: GalleryImage): number {
    const subjectId = GallerySortUtils.getSortSubjectId(image);
    return this.stateService.imageSort.rankedImageIds.indexOf(subjectId);
  }
}
