import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { GalleryGroup } from '../../models/gallery-group.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { Tag } from '../../models/tag.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';
import { TaggerSearchRowComponent } from './tagger-search-row/tagger-search-row.component';
import { TaggerRowComponent } from './tagger-row/tagger-row.component';

@Component({
  selector: 'app-tagger',
  imports: [CommonModule, TaggerRowComponent, TaggerSearchRowComponent, ImageComponent],
  templateUrl: './tagger.component.html',
  styleUrls: ['./tagger.component.scss']
})
export class TaggerComponent {

  protected target: GalleryImage;
  protected groupMode: boolean = false;
  protected query: string = '';
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
      if (this.target == null || !this.target.group) {
        this.groupMode = false;
        if (this.target == null) {
          return;
        }
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

  protected getFileType(image: GalleryImage): string | null {
    if (!image) {
      return null;
    }

    const extension: string | undefined = image.name?.split('.').pop()?.trim().toLowerCase();
    if (extension && extension !== image.name?.trim().toLowerCase()) {
      return extension.toUpperCase();
    }

    const mimeTypePart: string | undefined = image.mimeType?.split('/').pop()?.trim().toLowerCase();
    return mimeTypePart?.toUpperCase() || null;
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

  protected onNoteInput(event: Event): void {
    if (!this.target) {
      return;
    }

    const note: string = (event.target as HTMLInputElement)?.value ?? '';
    if (this.target.note === note) {
      return;
    }

    this.galleryService.updateNote(this.target, note);
  }

  protected onQueryInput(event: Event): void {
    this.query = ((event.target as HTMLInputElement)?.value ?? '').trim();
  }

  protected hasQuery(): boolean {
    return this.query.length > 0;
  }

  protected getFilteredTags(): Tag[] {
    const query: string = this.query.toLocaleLowerCase();

    return [...this.tagService.tags]
      .filter(tag => !tag.group)
      .filter(tag => tag.getNameWithParents().toLocaleLowerCase().includes(query))
      .sort((tag1, tag2) => {
        const nameDiff: number = tag1.name.localeCompare(tag2.name);
        if (nameDiff !== 0) {
          return nameDiff;
        }

        return tag1.getNameWithParents().localeCompare(tag2.getNameWithParents());
      });
  }

}
