import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { GalleryService } from '../../gallery.service';
import { Filter } from '../../model/filter.interface';
import { TagGroup } from '../../model/tag-group.interface';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent extends DialogContentBase<boolean> {

  public configuration: DialogContainerConfiguration = {
    title: 'Filter Configuration',
    buttons: [{
      text: () => 'OK',
      click: () => this.submit()
    }],
    hideHeaderCloseButton: true
  };

  protected groups: TagGroup[] = [];

  private changes: boolean = false;

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
    return group.tags.some(tag => tag.actualTag.state != 0);
  }

  protected getFilterClass(filter: Filter, isIcon: boolean = false): string {
    switch (filter.state) {
      case 1:
        return 'positive ' + (isIcon ? 'fa-solid' : '');
      case -1:
        return 'negative ' + (isIcon ? 'fa-solid' : '');
      default:
        return isIcon ? 'fa-regular' : '';
    }
  }

  protected toggleFilter(filter: Filter): void {
    this.changes = true;
    filter.state = filter.state == 0 ? 1 : filter.state == 1 ? -1 : 0;
    this.stateService.updateFilters();
  }

  protected clearFilters(): void {
    this.changes = true;
    this.stateService.tags.forEach(tag => tag.state = 0);
    this.stateService.updateFilters();
  }

  protected canClear(): boolean {
    return this.stateService.tags.some(tag => tag.state != 0);
  }

  public close(): void {
    if (this.changes) this.stateService.save();
    this.resolve(true);
  }

}
