import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GalleryService } from 'src/app/gallery/gallery.service';
import { GalleryImage } from 'src/app/gallery/model/gallery-image.class';
import { Tag } from 'src/app/gallery/model/tag.interface';
import { GalleryStateService } from 'src/app/gallery/services/gallery-state.service';
import { TagService } from 'src/app/gallery/services/tag.service';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { TagUtils } from 'src/app/shared/utils/tag.utils';

@Component({
  selector: 'app-tag-manager-row',
  standalone: true,
  imports: [
    CommonModule
  ],
  animations: [drawer2],
  templateUrl: './tag-manager-row.component.html',
  styleUrls: ['./tag-manager-row.component.scss']
})
export class TagManagerRowComponent {

  @Input() tag: Tag;
  @Input() target: GalleryImage;
  @Input() groupMode: boolean;

  constructor(
    protected tagService: TagService,
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) { }

  protected onTagClick(): void {
    if (this.tag.children.length == 0) {
      if (this.groupMode && this.target.group) {
        if (this.target.group.images.every(groupImage => groupImage.tags.includes(this.tag))) {
          this.target.group.images.forEach(groupImage => ArrayUtils.remove(groupImage.tags, this.tag));
        } else {
          this.target.group.images.forEach(groupImage => ArrayUtils.push(groupImage.tags, this.tag));
        }
      } else {
        ArrayUtils.toggle(this.target.tags, this.tag);
      }

      this.stateService.save();
      this.stateService.updateFilters();
    } else {
      this.tag.open = !this.tag.open;
    }
  }

  protected getTextClass(): string {
    const classes: string[] = [];
    if (this.target) {
      if (this.tag.children.length == 0) {
        if (this.target.tags.includes(this.tag)) {
          classes.push('positive');
        }

        if (this.target.group) {
          if (this.target.group.images.every(groupImage => groupImage.tags.includes(this.tag))) {
            classes.push('underline');
          } else if (this.target.group.images.some(groupImage => groupImage != this.target && groupImage.tags.includes(this.tag))) {
            classes.push('underline-dashed');
          }
        }
      } else {
        if (this.groupMode && this.target.group) {
          // all groupImages have all of the tagGroup's tags
          if (this.tag.children.every(groupTag => this.target.group.images.every(groupImage => groupImage.tags.includes(groupTag)))) {
            classes.push('positive');
            classes.push('underline');
          }

          // all groupImages have any of the tagGroup's tags
          if (this.tag.children.some(groupTag => this.target.group.images.every(groupImage => groupImage.tags.includes(groupTag)))) {
            classes.push('underline-dashed-positive');
          }

          // any groupImage has any of the tagGroup's tags
          if (this.tag.children.some(groupTag => this.target.group.images.some(groupImage => groupImage.tags.includes(groupTag)))) {
            classes.push('underline-dashed');
          }
        } else {
          if (this.target.tags.some(targetTag => this.tag.children.some(groupTag => groupTag == targetTag))) {
            classes.push('underline-dashed-positive');
          }
        }
      }
      return classes.join(' ');
    }
  }

  protected getOffset(tag: Tag): number {
    let offset = TagUtils.getDepth(tag);
    if (!tag.parent && tag.children.length == 0) offset++;
    return offset;
  }

  protected isGroup(): boolean {
    return this.tag.children.length != 0;
  }

}
