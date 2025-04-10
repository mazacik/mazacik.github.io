import { CommonModule } from '@angular/common';
import { Component, effect, HostListener } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { TippyDirective } from '@ngneat/helipopper';
import { fade } from 'src/app/shared/constants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { GalleryService } from '../gallery.service';
import { GalleryImage } from '../model/gallery-image.class';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-fullscreen',
  standalone: true,
  imports: [
    CommonModule,
    VariableDirective,
    TippyDirective
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
    protected stateService: GalleryStateService,
    protected dialogService: DialogService,
    protected galleryService: GalleryService
  ) {
    effect(() => {
      const target: GalleryImage = this.stateService.target();
      if (target) {
        this.update(target);
      } else {
        this.crossfadeHelper.length = 0;
      }
    });
  }

  private update(image: GalleryImage): void {
    if (image && this.crossfadeHelper[0] != image) {
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

  @HostListener('document:keydown', ['$event'])
  protected initKeybinds(event: KeyboardEvent): void {
    if (this.dialogService.dialogs.length == 0) {
      switch (event.code) {
        case 'Escape':
          this.stateService.target.set(null);
          return;
      }

      if (['BODY', 'VIDEO'].includes((event.target as HTMLElement).nodeName)) {
        if (this.stateService.target()) {
          switch (event.code) {
            case 'KeyR':
              this.setRandomTarget();
              return;
            case 'KeyG':
              this.setRandomGroupTarget();
              return;
          }
        }
      }
    }
  }

  protected setRandomTarget(): void {
    if (!ArrayUtils.isEmpty(this.stateService.filter())) {
      let nextTarget: GalleryImage;
      const currentTarget: GalleryImage = this.stateService.target();

      if (currentTarget) {
        if (currentTarget.group) {
          nextTarget = ArrayUtils.getRandom(this.stateService.filter(), currentTarget.group.images);
        } else {
          nextTarget = ArrayUtils.getRandom(this.stateService.filter(), [currentTarget]);
        }
      } else {
        nextTarget = ArrayUtils.getRandom(this.stateService.filter());
      }

      if (nextTarget) {
        this.stateService.target.set(nextTarget);
      }
    }
  }

  protected setRandomGroupTarget(): void {
    const target: GalleryImage = this.stateService.target();
    if (target?.group) {
      this.stateService.target.set(ArrayUtils.getRandom(target.group.images, [target]));
    }
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

  protected isFirstGroupImage(image: GalleryImage): boolean {
    return ArrayUtils.isFirst(image.group.images.filter(groupImage => groupImage.passesFilter), image);
  }

  protected isLastGroupImage(image: GalleryImage): boolean {
    return ArrayUtils.isLast(image.group.images.filter(groupImage => groupImage.passesFilter), image);
  }

  protected moveTargetGroupLeft(image: GalleryImage): void {
    this.stateService.target.set(ArrayUtils.getPrevious(image.group.images.filter(groupImage => groupImage.passesFilter), image, true));
  }

  protected moveTargetGroupRight(image: GalleryImage): void {
    this.stateService.target.set(ArrayUtils.getNext(image.group.images.filter(groupImage => groupImage.passesFilter), image, true));
  }

}
