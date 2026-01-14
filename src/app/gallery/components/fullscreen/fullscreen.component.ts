import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { ComparisonPathComponent } from '../../dialogs/comparison-path/comparison-path.component';
import { GalleryImage } from '../../models/gallery-image.class';
import { FilterService } from '../../services/filter.service';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';
import { GalleryUtils } from '../../../shared/utils/gallery.utils';

@Component({
  selector: 'app-fullscreen',
  imports: [CommonModule, ImageComponent],
  templateUrl: './fullscreen.component.html',
  styleUrls: ['./fullscreen.component.scss']
})
export class FullscreenComponent {
  protected readonly galleryUtils = GalleryUtils;

  protected loadingT: boolean = true;
  protected loadingC: boolean = true;
  protected video: boolean = false;

  protected comparisonWinners: GalleryImage[] = [];
  protected comparisonLosers: GalleryImage[] = [];

  constructor(
    // private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private dialogService: DialogService,
    protected googleService: GalleryGoogleDriveService,
    protected stateService: GalleryStateService,
    protected galleryService: GalleryService,
    protected tagService: TagService,
    protected filterService: FilterService
  ) {
    effect(() => {
      const target: GalleryImage = this.stateService.fullscreenImage();
      if (target) {
        if (GoogleFileUtils.isVideo(target)) {
          this.video = true;
        } else {
          this.video = false;
          this.loadingT = true;
          this.loadingC = true;
        }

        this.ensureTournamentInitialized();
        this.refreshComparisonRelations(target);

        // used in <video> display method
        // if (GoogleFileUtils.isVideo(image) && !this.applicationService.reduceBandwidth && !image.contentLink) {
        //   image.contentLink = '';
        //   this.googleService.getBase64(image.id).then(base64 => {
        //     image.contentLink = this.sanitizer.bypassSecurityTrustResourceUrl(base64) as string;
        //   });
        // }
      } else {
        this.comparisonWinners = [];
        this.comparisonLosers = [];
      }
    });
  }

  protected openComparisonPath(start: GalleryImage, end: GalleryImage): void {
    if (!start || !end) return;
    const dialogResult = this.dialogService.create(ComparisonPathComponent, { start, end });
    if (dialogResult) {
      dialogResult.then(changed => {
        if (changed) {
          const target: GalleryImage = this.stateService.fullscreenImage();
          if (target) {
            this.refreshComparisonRelations(target);
          } else {
            this.comparisonWinners = [];
            this.comparisonLosers = [];
          }
        }
      });
    }
  }

  private refreshComparisonRelations(target: GalleryImage): void {
    this.comparisonWinners = this.stateService.tournament.getNearestWinners(target);
    this.comparisonLosers = this.stateService.tournament.getNearestLosers(target);
  }

  private ensureTournamentInitialized(): void {
    if (this.stateService.tournament.comparisons != null) return;

    const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
    const filteredImages = this.filterService.images().filter(image => GoogleFileUtils.isImage(image));
    const imagesToCompare = filteredImages.length ? filteredImages : images;
    this.stateService.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
  }

  protected getSrc(image: GalleryImage): SafeUrl {
    if (!this.loadingC) return image.contentLink;
    if (!this.loadingT) return image.thumbnailLink;
  }

  protected onImageClick(image: GalleryImage): void {
    if (this.applicationService.reduceDataUsage) {
      image.thumbnailLink = image.thumbnailLink.replace('=s220', '=s440');
    }
  }

  protected snapshot(): void {
    const videoElement: HTMLVideoElement = document.getElementById('video-element') as HTMLVideoElement;
    if (videoElement) {
      const canvas: HTMLCanvasElement = document.createElement("canvas");
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      canvas.getContext("2d").drawImage(videoElement, 0, 0);
      const newTab: Window = window.open('about:blank', 'Video Snapshot');
      newTab.document.write("<img src='" + canvas.toDataURL('image/png') + "' alt='from canvas'/>");
    }
  }

}
