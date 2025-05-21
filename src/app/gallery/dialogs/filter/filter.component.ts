import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { GalleryService } from '../../gallery.service';
import { Filter } from '../../model/filter.interface';
import { TagGroup } from '../../model/tag-group.interface';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
    CommonModule,
    TippyDirective
  ],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent {

  @HostBinding('class.visible')
  public get classVisible(): boolean {
    return this.stateService.filterVisible;
  }

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) { }

  protected onTagGroupClick(group: TagGroup): void {
    if (this.stateService.openTagGroup == group) {
      if (group.tags.every(tag => tag.state == 1)) {
        group.tags.forEach(tag => tag.state = -1);
      } else if (group.tags.every(tag => tag.state == -1)) {
        group.tags.forEach(tag => tag.state = 0);
      } else {
        group.tags.forEach(tag => tag.state = 1);
      }
      this.stateService.updateFilters();
      this.stateService.save();
    } else {
      this.stateService.openTagGroup = group;
    }
  }

  protected toggleFilter(filter: Filter): void {
    filter.state = filter.state == 0 ? 1 : filter.state == 1 ? -1 : 0;
    this.stateService.updateFilters();
    this.stateService.save();
  }

  protected clearFilters(): void {
    this.stateService.tags.forEach(tag => tag.state = 0);
    this.stateService.updateFilters();
    this.stateService.save();
  }

  protected canClear(): boolean {
    return this.stateService.tags?.some(tag => tag.state != 0);
  }

  protected isSomeTagInGroupActive(group: TagGroup): boolean {
    return group.tags.some(tag => tag.state != 0);
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

}
