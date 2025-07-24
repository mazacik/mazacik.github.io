import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { TippyDirective } from '@ngneat/helipopper';
import { KeyboardShortcutTarget } from 'src/app/shared/classes/keyboard-shortcut-target.interface';
import { fade } from 'src/app/shared/constants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { KeyboardShortcutService } from 'src/app/shared/services/keyboard-shortcut.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GalleryService } from '../gallery.service';
import { GalleryImage } from '../model/gallery-image.class';
import { GalleryGoogleDriveService } from '../services/gallery-google-drive.service';
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
  animations: [fade, trigger('fadeBetweenGroupImages', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate('333ms ease', style({ opacity: 1 }))
    ]),
    transition(':leave', [
      style({ opacity: 1, 'pointer-events': 'none', 'z-index': -1 }),
      animate('333ms 333ms ease', style({ opacity: 0 }))
    ])
  ])]
})
export class FullscreenComponent implements KeyboardShortcutTarget, OnInit, OnDestroy {

  protected ScreenUtils = ScreenUtils;

  protected loadingT: boolean = true;
  protected loadingC: boolean = true;
  protected video: boolean = false;
  protected flip: boolean = false;

  constructor(
    // private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private keyboardShortcutService: KeyboardShortcutService,
    protected googleService: GalleryGoogleDriveService,
    protected stateService: GalleryStateService,
    protected dialogService: DialogService,
    protected galleryService: GalleryService
  ) {
    effect(() => {
      const target: GalleryImage = this.stateService.target();
      if (target) {
        if (GoogleFileUtils.isVideo(target)) {
          this.video = true;
        } else {
          this.video = false;
          this.loadingT = true;
          this.loadingC = true;
        }

        this.keyboardShortcutService.requestFocus(this);

        // used in <video> display method
        // if (GoogleFileUtils.isVideo(image) && !this.applicationService.reduceBandwidth && !image.contentLink) {
        //   image.contentLink = '';
        //   this.googleService.getBase64(image.id).then(base64 => {
        //     image.contentLink = this.sanitizer.bypassSecurityTrustResourceUrl(base64) as string;
        //   });
        // }
      } else {
        this.flip = false;
      }
    });
  }

  ngOnInit(): void {
    this.keyboardShortcutService.register(this);
  }

  ngOnDestroy(): void {
    this.keyboardShortcutService.unregister(this);
  }

  processKeyboardShortcut(event: KeyboardEvent): void {
    if (this.stateService.target()) {
      switch (event.code) {
        case 'Escape':
          this.stateService.target.set(null);
          break;
        case 'KeyR':
          this.setRandomTarget();
          break;
        case 'KeyG':
          this.setRandomGroupTarget();
          break;
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
