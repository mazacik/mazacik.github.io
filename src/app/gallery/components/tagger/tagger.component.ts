import { CommonModule } from '@angular/common';
import { Component, effect, HostBinding } from '@angular/core';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GalleryImage } from '../../models/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';
import { TagService } from '../../services/tag.service';
import { TaggerRowComponent } from './tagger-row/tagger-row.component';

@Component({
    selector: 'app-tagger',
    imports: [
        CommonModule,
        TaggerRowComponent
    ],
    templateUrl: './tagger.component.html',
    styleUrls: ['./tagger.component.scss']
})
export class TaggerComponent {

  protected ScreenUtils = ScreenUtils;
  protected fileInfoOpen: boolean = false;

  @HostBinding('class.visible')
  public get classVisible(): boolean {
    return this.stateService.taggerVisible;
  }

  protected target: GalleryImage;
  protected groupMode: boolean = false;

  constructor(
    protected tagService: TagService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.target = this.stateService.fullscreenImage();
      if (this.target == null) {
        this.groupMode = false;
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
