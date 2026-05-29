import { Component, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-image-tournament-longest-chain',
  imports: [],
  templateUrl: './image-tournament-longest-chain.component.html',
  styleUrls: ['./image-tournament-longest-chain.component.scss']
})
export class ImageTournamentLongestChainComponent {
  protected rankedImages: GalleryImage[] = [];

  constructor(
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.stateService.imageSort.stateVersion();
      this.refresh();
    });
  }

  private refresh(): void {
    const imageById = new Map(this.stateService.images.map(image => [image.id, image]));
    this.rankedImages = this.stateService.imageSort.rankedImageIds.map(id => imageById.get(id)).filter(Boolean);
  }

  protected openFullscreen(image: GalleryImage): void {
    if (!image) return;
    this.stateService.fullscreenImage.set(image);
  }
}
