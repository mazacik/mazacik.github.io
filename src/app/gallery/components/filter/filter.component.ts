import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Filter } from '../../models/filter.class';
import { Tag } from '../../models/tag.class';
import { FilterService } from '../../services/filter.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { TagService } from '../../services/tag.service';
import { FilterRowComponent } from './filter-row/filter-row.component';

@Component({
  selector: 'app-filter',
  imports: [CommonModule, FilterRowComponent],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
  host: {
    '[class.hidden]': '!stateService.filterVisible'
  }
})
export class FilterComponent {

  protected searchQuery: string = '';

  constructor(
    private serializationService: GallerySerializationService,
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

  protected onSearchQueryInput(event: Event): void {
    this.searchQuery = ((event.target as HTMLInputElement)?.value ?? '').trim();
  }

  protected clearSearchQuery(input: HTMLInputElement): void {
    this.searchQuery = '';
    input.value = '';
    input.focus();
  }

  protected hasSearchQuery(): boolean {
    return this.searchQuery.length > 0;
  }

  protected getSearchResultTags(): Tag[] {
    return this.tagService.searchTags(this.searchQuery);
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
