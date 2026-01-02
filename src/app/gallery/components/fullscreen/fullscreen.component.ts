import { CommonModule } from '@angular/common';
import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { KeyboardShortcutTarget } from 'src/app/shared/classes/keyboard-shortcut-target.interface';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { KeyboardShortcutService } from 'src/app/shared/services/keyboard-shortcut.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GalleryGroup } from '../../models/gallery-group.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { FilterService } from '../../services/filter.service';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ComparisonPathComponent } from '../../dialogs/comparison-path/comparison-path.component';

@Component({
  selector: 'app-fullscreen',
  imports: [CommonModule, ImageComponent],
  templateUrl: './fullscreen.component.html',
  styleUrls: ['./fullscreen.component.scss']
})
export class FullscreenComponent implements KeyboardShortcutTarget, OnInit, OnDestroy {

  protected ScreenUtils = ScreenUtils;

  protected loadingT: boolean = true;
  protected loadingC: boolean = true;
  protected video: boolean = false;

  protected currentGroup: GalleryGroup;
  protected groupTracker = 0;

  protected hideSidebarButtons: boolean = false;

  constructor(
    // private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private keyboardShortcutService: KeyboardShortcutService,
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

        this.keyboardShortcutService.requestFocus(this);

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
    if (this.stateService.fullscreenImage()) {
      switch (event.code) {
        case 'Escape':
          this.stateService.fullscreenImage.set(null);
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
    const filter: GalleryImage[] = this.filterService.images();
    if (!ArrayUtils.isEmpty(filter)) {
      let nextTarget: GalleryImage;
      const currentTarget: GalleryImage = this.stateService.fullscreenImage();

      if (currentTarget) {
        if (currentTarget.group) {
          nextTarget = ArrayUtils.getRandom(filter, currentTarget.group.images);
        } else {
          nextTarget = ArrayUtils.getRandom(filter, [currentTarget]);
        }
      } else {
        nextTarget = ArrayUtils.getRandom(filter);
      }

      if (nextTarget) {
        this.stateService.fullscreenImage.set(nextTarget);
      }
    }
  }

  protected setRandomGroupTarget(): void {
    const target: GalleryImage = this.stateService.fullscreenImage();
    if (target?.group) {
      this.stateService.fullscreenImage.set(ArrayUtils.getRandom(target.group.images, [target]));
    }
  }

  protected openGroupComparison(): void {
    const target: GalleryImage = this.stateService.fullscreenImage();
    if (target?.group) {
      this.stateService.viewMode = 'tournament';
      const images: GalleryImage[] = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
      const imagesToCompare: GalleryImage[] = target.group.images.filter(image => GoogleFileUtils.isImage(image));
      this.stateService.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
    }
  }

  protected openComparisonPath(start: GalleryImage, end: GalleryImage): void {
    if (!start || !end) return;
    this.dialogService.create(ComparisonPathComponent, { start, end });
  }

  protected getSrc(image: GalleryImage): SafeUrl {
    if (!this.loadingC) return image.contentLink;
    if (!this.loadingT) return image.thumbnailLink;
  }

  protected onImageClick(image: GalleryImage): void {
    this.hideSidebarButtons = !this.hideSidebarButtons;
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
