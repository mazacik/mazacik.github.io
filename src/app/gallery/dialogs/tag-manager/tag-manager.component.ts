import { CommonModule } from '@angular/common';
import { Component, effect, HostBinding } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GalleryService } from '../../gallery.service';
import { GalleryImage } from '../../model/gallery-image.class';
import { TagGroup } from '../../model/tag-group.interface';
import { Tag } from '../../model/tag.interface';
import { GalleryStateService } from '../../services/gallery-state.service';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [
    CommonModule,
    TippyDirective
  ],
  templateUrl: './tag-manager.component.html',
  styleUrls: ['./tag-manager.component.scss']
})
export class TagManagerComponent {

  protected ScreenUtils = ScreenUtils;

  @HostBinding('class.visible')
  public get classVisible(): boolean {
    return this.stateService.tagManagerVisible;
  }

  protected target: GalleryImage;
  protected groupMode: boolean = false;

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.target = this.stateService.target();
      if (this.target == null) {
        this.groupMode = false;
      }
    });
  }

  protected groupModeWarningFlash: boolean = false;
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
        if (image.group.tags.includes(tag)) {
          this.groupModeWarningFlash = true;
          setTimeout(() => this.groupModeWarningFlash = false, 500);
          return;
        } else {
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

}
