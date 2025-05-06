import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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

  public override inputs: { image: GalleryImage };

  public configuration: DialogContainerConfiguration = {
    title: 'Tag Manager',
    buttons: [{
      text: () => 'Save',
      click: () => this.submit()
    }],
    hideHeaderCloseButton: true
  };

  protected groupMode: boolean = false;
  protected changes: boolean = false;

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) {
    super();
  }

  public toggleTag(image: GalleryImage, tag: Tag): void {
    this.changes = true;
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
  }

  protected isSomeTagActiveInGroup(group: TagGroup): boolean {
    if (this.inputs.image.group && group.tags.some(tag1 => this.inputs.image.group.tags.some(tag2 => tag1 == tag2))) {
      return true;
    }

    if (!this.groupMode) {
      return group.tags.some(tag1 => this.inputs.image.tags.some(tag2 => tag1 == tag2));
    }
  }

  protected getFavoriteClass(isIcon: boolean): string {
    if (!this.groupMode && this.inputs.image.heart) {
      return isIcon ? 'positive fa-solid' : 'positive';
    } else {
      return isIcon ? 'fa-regular' : '';
    }
  }

  protected getBookmarkClass(isIcon: boolean): string {
    if (!this.groupMode && this.inputs.image.bookmark) {
      return isIcon ? 'positive fa-solid' : 'positive';
    } else {
      return isIcon ? 'fa-regular' : '';
    }
  }

  protected getTagClass(tag: Tag): string {
    const classes: string[] = [];
    if (this.inputs.image.group) {
      if (this.groupMode) {
        classes.push('cursor-pointer');
        classes.push('hover-brighten');

        if (this.inputs.image.group.tags.includes(tag)) {
          classes.push('positive');
        }
      } else {
        if (this.inputs.image.group.tags.includes(tag)) {
          classes.push('positive');
          classes.push('underline');
          classes.push('opacity-075');
        } else {
          classes.push('cursor-pointer');
          classes.push('hover-brighten');
        }

        if (this.inputs.image.tags.includes(tag)) {
          classes.push('positive');
        }
      }
    } else {
      classes.push('cursor-pointer');
      classes.push('hover-brighten');

      if (this.inputs.image.tags.includes(tag)) {
        classes.push('positive');
      }
    }

    return classes.join(' ');
  }

  public close(): void {
    if (this.changes) {
      this.stateService.save();
      this.stateService.updateFilters();
    }
    this.resolve(true);
  }

}
