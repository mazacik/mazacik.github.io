import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { Filter } from '../../models/filter.interface';
import { FilterService } from '../../services/filter.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { SerializationService } from '../../services/serialization.service';
import { TagService } from '../../services/tag.service';
import { FilterRowComponent } from './filter-row/filter-row.component';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, TippyDirective, FilterRowComponent],
  animations: [drawer2],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
})
export class FilterComponent {
  protected ScreenUtils = ScreenUtils;

  @HostBinding('class.visible')
  public get classVisible(): boolean {
    return this.stateService.filterVisible;
  }

  constructor(
    private serializationService: SerializationService,
    protected tagService: TagService,
    protected filterService: FilterService,
    protected stateService: GalleryStateService
  ) { }

  protected getFilterClass(filter: Filter): string {
    switch (filter.state) {
      case 1:
        return 'positive';
      case -1:
        return 'negative';
    }
  }

  protected getFilterIconClass(filter: Filter): string {
    switch (filter.state) {
      case 1:
        return 'positive fa-solid';
      case -1:
        return 'negative fa-solid';
      default:
        return 'fa-regular';
    }
  }

  protected toggleFilter(filter: Filter): void {
    filter.state = filter.state == 0 ? 1 : filter.state == 1 ? -1 : 0;
    this.filterService.updateFilters();
    this.serializationService.save();
  }

  protected clearFilters(): void {
    this.tagService.tags.forEach(tag => tag.state = 0);
    this.filterService.updateFilters();
    this.serializationService.save();
  }

  protected canClear(): boolean {
    return this.tagService.tags.some(tag => tag.state != 0);
  }
}
