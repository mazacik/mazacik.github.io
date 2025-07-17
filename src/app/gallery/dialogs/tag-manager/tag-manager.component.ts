import { CommonModule } from '@angular/common';
import { Component, effect, HostBinding } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GalleryService } from '../../gallery.service';
import { GalleryImage } from '../../model/gallery-image.class';
import { TagGroup } from '../../model/tag-group.interface';
import { Tag } from '../../model/tag.interface';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [
    CommonModule,
    TippyDirective
  ],
  animations: [drawer2],
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

  public toggleTag(image: GalleryImage, tag: Tag): void {
    if (image.group && this.groupMode) {
      if (image.group.images.every(groupImage => groupImage.tags.includes(tag))) {
        image.group.images.forEach(groupImage => ArrayUtils.remove(groupImage.tags, tag));
      } else {
        image.group.images.forEach(groupImage => ArrayUtils.push(groupImage.tags, tag));
      }
    } else {
      ArrayUtils.toggle(image.tags, tag);
    }

    this.stateService.save();
    this.stateService.updateFilters();
  }

  protected getTagGroupClass(group: TagGroup): string {
    const classes: string[] = [];

    if (this.target) {
      if (this.groupMode && this.target.group) {
        // all groupImages have all of the tagGroup's tags
        if (group.tags.every(groupTag => this.target.group.images.every(groupImage => groupImage.tags.includes(groupTag)))) {
          classes.push('positive');
          classes.push('underline');
        }

        // all groupImages have any of the tagGroup's tags
        if (group.tags.some(groupTag => this.target.group.images.every(groupImage => groupImage.tags.includes(groupTag)))) {
          classes.push('underline-dashed-positive');
        }

        // any groupImage has any of the tagGroup's tags
        if (group.tags.some(groupTag => this.target.group.images.some(groupImage => groupImage.tags.includes(groupTag)))) {
          classes.push('underline-dashed');
        }
      } else {
        if (this.target.tags.some(targetTag => group.tags.some(groupTag => groupTag == targetTag))) {
          classes.push('positive');
        }
      }
    }

    return classes.join(' ');
  }

  protected getTagClass(tag: Tag): string {
    const classes: string[] = [];

    if (this.target) {
      if (this.target.tags.includes(tag)) {
        classes.push('positive');
      }

      if (this.target.group) {
        if (this.target.group.images.every(groupImage => groupImage.tags.includes(tag))) {
          classes.push('underline');
        } else if (this.target.group.images.some(groupImage => groupImage != this.target && groupImage.tags.includes(tag))) {
          classes.push('underline-dashed');
        }
      }
    }

    return classes.join(' ');
  }

  protected getTagCount(tag: Tag): number {
    let count: number = 0;

    for (const image of this.stateService.images) {
      if (image.tags.includes(tag)) {
        count++;
      }
    }

    return count;
  }

}
