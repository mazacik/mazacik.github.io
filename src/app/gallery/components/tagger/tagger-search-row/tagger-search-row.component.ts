import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Tag } from 'src/app/gallery/models/tag.class';
import { FilterService } from 'src/app/gallery/services/filter.service';
import { GallerySerializationService } from 'src/app/gallery/services/gallery-serialization.service';
import { GalleryStateService } from 'src/app/gallery/services/gallery-state.service';
import { GalleryService } from 'src/app/gallery/services/gallery.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';

@Component({
  selector: 'app-tagger-search-row',
  imports: [CommonModule],
  templateUrl: './tagger-search-row.component.html',
  styleUrls: ['./tagger-search-row.component.scss']
})
export class TaggerSearchRowComponent {

  @Input() tag: Tag;
  @Input() target: GalleryImage;
  @Input() groupMode: boolean;

  constructor(
    private filterService: FilterService,
    private serializationService: GallerySerializationService,
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) { }

  protected onTagClick(): void {
    if (!this.target || this.tag.pseudo) {
      return;
    }

    if (this.groupMode && this.target.group) {
      if (this.target.group.images.every(groupImage => groupImage.tags.includes(this.tag))) {
        this.target.group.images.forEach(groupImage => ArrayUtils.remove(groupImage.tags, this.tag));
      } else {
        this.target.group.images.forEach(groupImage => ArrayUtils.push(groupImage.tags, this.tag));
      }
    } else {
      ArrayUtils.toggle(this.target.tags, this.tag);
    }

    this.serializationService.save();
    this.filterService.updateFilters();
  }

  protected getTextClass(): string {
    if (this.tag.pseudo) return '';

    const classes: string[] = [];

    if (this.target) {
      if (this.target.group) {
        if (this.groupMode) {
          if (this.target.group.images.every(groupImage => groupImage.tags.includes(this.tag))) {
            classes.push('positive');
          } else if (this.target.group.images.some(groupImage => groupImage.tags.includes(this.tag))) {
            classes.push('underline-positive');
          }
        } else {
          const groupImagesExceptTarget: GalleryImage[] = ArrayUtils.except(this.target.group.images, this.target);
          if (this.target.group.images.every(groupImage => groupImage.tags.includes(this.tag))) {
            classes.push('underline-positive');
          } else if (groupImagesExceptTarget.some(groupImage => groupImage.tags.includes(this.tag))) {
            classes.push('underline-dashed-positive');
          }

          if (this.target.tags.includes(this.tag)) {
            classes.push('positive');
          }
        }
      } else if (this.target.tags.includes(this.tag)) {
        classes.push('positive');
      }
    }

    return classes.join(' ');
  }

  protected openOptions(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.galleryService.openTagOptions(this.tag);
  }

}
