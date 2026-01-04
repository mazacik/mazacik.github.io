import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { ComparisonPathComponent } from '../../dialogs/comparison-path/comparison-path.component';
import { GalleryGroup } from '../../models/gallery-group.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { FilterService } from '../../services/filter.service';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';

@Component({
  selector: 'app-fullscreen',
  imports: [CommonModule, ImageComponent],
  templateUrl: './fullscreen.component.html',
  styleUrls: ['./fullscreen.component.scss']
})
export class FullscreenComponent {

  protected loadingT: boolean = true;
  protected loadingC: boolean = true;
  protected video: boolean = false;

  protected currentGroup: GalleryGroup;
  protected groupTracker = 0;

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

        this.refreshComparisonRelations(target);

        if (this.currentGroup != target.group) {
          this.currentGroup = target.group;
          this.groupTracker++;
        }

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
    this.dialogService.create(ComparisonPathComponent, { start, end });
  }

  private refreshComparisonRelations(target: GalleryImage): void {
    this.comparisonWinners = this.stateService.tournament.getNearestWinners(target);
    this.comparisonLosers = this.stateService.tournament.getNearestLosers(target);
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

  protected isFirstGroupImage(image: GalleryImage): boolean {
    return ArrayUtils.isFirst(image.group.images.filter(groupImage => groupImage.passesFilters), image);
  }

  protected isLastGroupImage(image: GalleryImage): boolean {
    return ArrayUtils.isLast(image.group.images.filter(groupImage => groupImage.passesFilters), image);
  }

  protected moveTargetGroupLeft(image: GalleryImage): void {
    this.stateService.fullscreenImage.set(ArrayUtils.getPrevious(image.group.images.filter(groupImage => groupImage.passesFilters), image, true));
  }

  protected moveTargetGroupRight(image: GalleryImage): void {
    this.stateService.fullscreenImage.set(ArrayUtils.getNext(image.group.images.filter(groupImage => groupImage.passesFilters), image, true));
  }

}
