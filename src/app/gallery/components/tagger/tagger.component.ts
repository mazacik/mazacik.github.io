import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { GalleryGroup } from '../../models/gallery-group.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';
import { TaggerRowComponent } from './tagger-row/tagger-row.component';

@Component({
  selector: 'app-tagger',
  imports: [CommonModule, TaggerRowComponent, ImageComponent],
  templateUrl: './tagger.component.html',
  styleUrls: ['./tagger.component.scss']
})
export class TaggerComponent {

  protected target: GalleryImage;
  protected groupMode: boolean = false;
  protected currentGroup: GalleryGroup;
  protected groupTracker = 0;

  constructor(
    protected tagService: TagService,
    protected galleryService: GalleryService,
    protected googleService: GalleryGoogleDriveService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.target = this.stateService.fullscreenImage();
      if (this.target == null) {
        this.groupMode = false;
        return;
      }

      if (this.currentGroup != this.target.group) {
        this.currentGroup = this.target.group;
        this.groupTracker++;
      }
    });
  }

  protected getFileSize(image: GalleryImage): string | null {
    const size: number = Number(image?.size);
    if (!image || Number.isNaN(size)) return null;
    const kilobytes: number = size / 1024;
    return kilobytes.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' KB';
  }

  protected getResolution(image: GalleryImage): string | null {
    if (image?.imageMediaMetadata?.width && image?.imageMediaMetadata?.height) {
      return image.imageMediaMetadata.width + ' x ' + image.imageMediaMetadata.height;
    }

    if (image?.videoMediaMetadata?.width && image?.videoMediaMetadata?.height) {
      return image.videoMediaMetadata.width + ' x ' + image.videoMediaMetadata.height;
    }

    return null;
  }

}
