import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { fade } from 'src/app/shared/consntants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { GalleryImage } from '../model/gallery-image.class';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-fullscreen',
  standalone: true,
  imports: [
    CommonModule,
    VariableDirective
  ],
  templateUrl: './fullscreen.component.html',
  styleUrls: ['./fullscreen.component.scss'],
  animations: [fade]
})
export class FullscreenComponent {

  protected crossfadeHelper: GalleryImage[] = [];
  protected loadingT: boolean = true;
  protected loadingC: boolean = true;
  protected video: boolean = false;

  constructor(
    // private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    // private googleService: GalleryGoogleDriveService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      if (this.stateService.fullscreenVisible()) {
        this.update(this.stateService.target());
      } else {
        this.crossfadeHelper.length = 0;
      }
    });
  }

  private update(image: GalleryImage): void {
    if (this.crossfadeHelper[0] != image) {
      this.crossfadeHelper[0] = image;

      if (GoogleFileUtils.isVideo(image)) {
        this.video = true;
      } else {
        this.video = false;
        this.loadingT = true;
        this.loadingC = true;
      }
    }

    // used in <video> display method
    // if (GoogleFileUtils.isVideo(image) && !this.applicationService.reduceBandwidth && !image.contentLink) {
    //   image.contentLink = '';
    //   this.googleService.getBase64(image.id).then(base64 => {
    //     image.contentLink = this.sanitizer.bypassSecurityTrustResourceUrl(base64) as string;
    //   });
    // }
  }

  protected getSrc(image: GalleryImage): SafeUrl {
    if (!this.loadingC) return image.contentLink;
    if (!this.loadingT) return image.thumbnailLink;
  }

  protected onImageClick(image: GalleryImage): void {
    if (this.applicationService.reduceBandwidth) {
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
