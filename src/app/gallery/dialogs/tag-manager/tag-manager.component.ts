import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { GalleryService } from '../../gallery.service';
import { GalleryImage } from '../../model/gallery-image.class';
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

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) {
    super();
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
    if (this.inputs.image.tagIds.includes(tag.id)) {
      return isIcon ? 'positive fa-solid' : 'positive';
    } else {
      return isIcon ? 'fa-regular' : '';
    }
  }

  public close(): void {
    this.stateService.save();
    this.stateService.updateFilters();
    this.resolve(true);
  }

}
