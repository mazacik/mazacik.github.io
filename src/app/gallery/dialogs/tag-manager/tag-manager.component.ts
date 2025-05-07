import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GalleryService } from '../../gallery.service';
import { GalleryImage } from '../../model/gallery-image.class';
import { TagGroup } from '../../model/tag-group.interface';
import { Tag } from '../../model/tag.interface';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './tag-manager.component.html',
  styleUrls: ['./tag-manager.component.scss']
})
export class TagManagerComponent extends DialogContentBase<boolean> {

  public configuration: DialogContainerConfiguration = {
    title: 'Tag Manager',
    buttons: [{
      text: () => 'OK',
      click: () => this.close()
    }],
    hideHeaderCloseButton: true,
    hideClickOverlay: true
  };

  protected target: GalleryImage;
  protected groupMode: boolean = false;

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) {
    super();
    effect(() => {
      this.target = this.stateService.target();
      if (this.target == null) {
        this.groupMode = false;
      }
    });
  }

  public toggleTag(image: GalleryImage, tag: Tag): void {
    if (image.group) {
      if (this.groupMode) {
        if (image.group.tags.includes(tag)) {
          ArrayUtils.remove(image.group.tags, tag);
        } else {
          image.group.tags.push(tag);
          image.group.images.forEach(groupImage => ArrayUtils.remove(groupImage.tags, tag));
        }
      } else {
        if (!image.group.tags.includes(tag)) {
          ArrayUtils.toggle(image.tags, tag);
        }
      }
    } else {
      ArrayUtils.toggle(image.tags, tag);
    }

    this.stateService.save();
    this.stateService.updateFilters();
  }

  protected isSomeTagActiveInGroup(group: TagGroup): boolean {
    if (this.target) {
      if (this.target.group && group.tags.some(tag1 => this.target.group.tags.some(tag2 => tag1 == tag2))) {
        return true;
      }

      if (!this.groupMode) {
        return group.tags.some(tag1 => this.target.tags.some(tag2 => tag1 == tag2));
      }
    }
  }

  protected getTagClass(tag: Tag): string {
    const classes: string[] = [];

    if (this.target) {
      if (this.target.group) {
        if (this.groupMode) {
          classes.push('cursor-pointer');
          classes.push('hover-brighten');

          if (this.target.group.tags.includes(tag)) {
            classes.push('positive');
          }
        } else {
          if (this.target.group.tags.includes(tag)) {
            classes.push('positive');
            classes.push('underline');
            classes.push('opacity-075');
            classes.push('pointer-events-none');
          } else {
            classes.push('cursor-pointer');
            classes.push('hover-brighten');
          }

          if (this.target.tags.includes(tag)) {
            classes.push('positive');
          }
        }
      } else {
        classes.push('cursor-pointer');
        classes.push('hover-brighten');

        if (this.target.tags.includes(tag)) {
          classes.push('positive');
        }
      }
    }

    return classes.join(' ');
  }

  public close(): void {
    this.resolve(true);
  }

}
