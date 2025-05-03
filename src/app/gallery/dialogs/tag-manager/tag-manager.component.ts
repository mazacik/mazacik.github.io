import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
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

  protected groups: TagGroup[] = [];

  protected changes: boolean = false;

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) {
    super();

    for (const tag of this.stateService.tags) {
      const [groupName, tagName] = tag.name.split(' - ');
      const group = this.groups.find(group => group.name == groupName);
      if (group) {
        group.tags.push({ actualTag: tag, name: tagName });
      } else {
        this.groups.push({ name: groupName, tags: [{ actualTag: tag, name: tagName }] });
      }
    }

    if (this.stateService.openTagGroup == null) {
      this.stateService.openTagGroup = this.groups[0];
    } else {
      this.stateService.openTagGroup = this.groups.find(group => group.name == this.stateService.openTagGroup.name);
    }
  }

  protected isSomeTagInGroupActive(group: TagGroup): boolean {
    const actualTagNames = group.tags.map(tag => tag.actualTag.name);
    return this.inputs.image.tags.some(tag => actualTagNames.includes(tag));
  }

  protected getFavoriteClass(isIcon: boolean): string {
    if (this.inputs.image.heart) {
      return isIcon ? 'positive fa-solid' : 'positive';
    } else {
      return isIcon ? 'fa-regular' : '';
    }
  }

  protected getBookmarkClass(isIcon: boolean): string {
    if (this.inputs.image.bookmark) {
      return isIcon ? 'positive fa-solid' : 'positive';
    } else {
      return isIcon ? 'fa-regular' : '';
    }
  }

  protected getTagClass(tag: Tag, isIcon: boolean = false): string {
    if (this.inputs.image.tags.includes(tag.name)) {
      return isIcon ? 'positive fa-solid' : 'positive';
    } else {
      return isIcon ? 'fa-regular' : '';
    }
  }

  public close(): void {
    if (this.changes) {
      this.stateService.save();
      this.stateService.updateFilters();
    }
    this.resolve(true);
  }

}
