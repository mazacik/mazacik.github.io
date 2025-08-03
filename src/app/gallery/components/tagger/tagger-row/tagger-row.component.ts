import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Tag } from 'src/app/gallery/models/tag.class';
import { GalleryStateService } from 'src/app/gallery/services/gallery-state.service';
import { GalleryService } from 'src/app/gallery/services/gallery.service';
import { TagDragDropService } from 'src/app/gallery/services/tag-drag-drop.service';
import { TagService } from 'src/app/gallery/services/tag.service';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-tagger-row',
  standalone: true,
  imports: [
    CommonModule, VariableDirective
  ],
  animations: [drawer2],
  templateUrl: './tagger-row.component.html',
  styleUrls: ['./tagger-row.component.scss']
})
export class TaggerRowComponent {

  @Input() tag: Tag;
  @Input() target: GalleryImage;
  @Input() groupMode: boolean;

  constructor(
    protected tagService: TagService,
    protected tagDragDropService: TagDragDropService,
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) { }

  protected onTagClick(): void {
    if (this.tag.group) {
      this.tag.open = !this.tag.open;
    } else if (!this.tag.isPseudo()) {
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
    }
  }

  protected getTextClass(): string {
    if (this.tag.isPseudo()) return '';

    const classes: string[] = [];

    if (this.target) {
      if (this.target.group) {
        if (this.groupMode) {
          if (this.tag.group) {
            const children: Tag[] = this.tag.collectChildren();
            if (this.target.group.images.every(groupImage => children.some(child => groupImage.tags.includes(child)))) {
              // all images have some tag from tag group -> green dashed underline?
              classes.push('positive');
            } else if (this.target.group.images.some(groupImage => children.some(child => groupImage.tags.includes(child)))) {
              // some images from group have some tag from tag group -> white dashed underline?
              classes.push('underline-positive');
            }
          } else {
            if (this.target.group.images.every(groupImage => groupImage.tags.includes(this.tag))) {
              // all images from group have tag -> green text
              classes.push('positive');
            } else if (this.target.group.images.some(groupImage => groupImage.tags.includes(this.tag))) {
              // some images from group have tag -> green underline?
              classes.push('underline-positive');
            }
          }
        } else {
          const groupImagesExceptTarget: GalleryImage[] = ArrayUtils.except(this.target.group.images, this.target);
          if (this.tag.group) {
            const children: Tag[] = this.tag.collectChildren();
            if (this.target.tags.some(imageTag => children.includes(imageTag))) {
              classes.push('positive');
            } else if (groupImagesExceptTarget.some(groupImage => groupImage.tags.some(imageTag => children.includes(imageTag)))) {
              classes.push('underline-dashed-positive');
            }
          } else {
            if (this.target.group.images.every(groupImage => groupImage.tags.includes(this.tag))) {
              classes.push('underline-positive');
            } else if (groupImagesExceptTarget.some(groupImage => groupImage.tags.includes(this.tag))) {
              classes.push('underline-dashed-positive');
            }
            if (this.target.tags.includes(this.tag)) {
              classes.push('positive');
            }
          }
        }
      } else {
        if (this.tag.group) {
          if (this.tag.collectChildren().some(child => this.target.tags.includes(child))) {
            classes.push('underline-positive');
          }
        } else {
          if (this.target.tags.includes(this.tag)) {
            classes.push('positive');
          }
        }
      }
    }

    return classes.join(' ');
  }

  protected getTagGroups(): Tag[] {
    return this.tag.children.filter(t => t.group);
  }

  protected getTags(): Tag[] {
    return this.tag.children.filter(t => !t.group);
  }

  protected encryptSimple(value: string): string {
    return StringUtils.encryptSimple(value);
  }

}
