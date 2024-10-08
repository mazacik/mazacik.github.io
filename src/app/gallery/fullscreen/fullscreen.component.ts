import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { TippyDirective } from '@ngneat/helipopper';
import { fade } from 'src/app/shared/constants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { GalleryTagEditorComponent } from '../dialogs/gallery-tag-editor/gallery-tag-editor.component';
import { GalleryImage } from '../model/gallery-image.class';
import { Tag } from '../model/tag.interface';
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
    protected dialogService: DialogService
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

  protected getTag(tagId: string): Tag {
    for (const tagGroup of this.stateService.tagGroups) {
      for (const tag of tagGroup.tags) {
        if (tag.id == tagId) {
          return tag;
        }
      }
    }
  }

  protected editTag(tagId: string): void {
    const tag: Tag = this.getTag(tagId);
    this.dialogService.create(GalleryTagEditorComponent, {
      group: this.stateService.tagGroups.find(tagGroup => tagGroup.tags.includes(tag)),
      tag: tag
    });
  }

  protected removeTag(tagId: string): void {
    this.stateService.toggleTag(this.stateService.target(), tagId);
  }

  protected createTag(): void {
    this.dialogService.create(GalleryTagEditorComponent);
  }

  protected tagMatch: Tag;
  protected onTagInput(event: Event): void {
    const lowerCaseQueryCharacters: string = (event.target as HTMLInputElement).value.toLowerCase();
    if (lowerCaseQueryCharacters.length > 0) {
      for (const group of this.stateService.tagGroups) {
        for (const tag of group.tags) {
          if (tag.lowerCaseName.startsWith(lowerCaseQueryCharacters)) {
            this.tagMatch = tag;
            (event.target as HTMLInputElement).value = tag.name.substring(0, lowerCaseQueryCharacters.length);
            return;
          }
        }
      }
    }

    this.tagMatch = null;
  }

  protected async onTagInputSubmit(event?: KeyboardEvent): Promise<void> {
    if (!event || event.key === 'Enter') {
      const tagInput: HTMLInputElement = (document.getElementById('tag-input') as HTMLInputElement);
      if (!this.tagMatch) {
        this.tagMatch = await this.dialogService.create(GalleryTagEditorComponent, { tagName: tagInput.value });
      }

      if (this.tagMatch) {
        this.stateService.addTag(this.stateService.target(), this.tagMatch.id);
        this.tagMatch = null;
        tagInput.value = '';
      }
    }
  }

}
