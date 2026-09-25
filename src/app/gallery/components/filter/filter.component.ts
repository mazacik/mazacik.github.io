import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChild, ViewChildren, afterEveryRender } from '@angular/core';
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
  private focusedTagId: string | null = null;
  private scrollSelectionAfterRender = false;

  private searchInput: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') private set searchInputElement(input: ElementRef<HTMLInputElement>) {
    this.searchInput = input;
    input?.nativeElement.focus();
  }
  @ViewChild('resultsContainer') private resultsContainer: ElementRef<HTMLElement>;
  @ViewChildren('listRow') private listRows: QueryList<FilterRowComponent>;

  constructor(
    private serializationService: GallerySerializationService,
    protected tagService: TagService,
    protected filterService: FilterService,
    protected stateService: GalleryStateService
  ) {
    afterEveryRender(() => {
      if (!this.scrollSelectionAfterRender) return;
      const focused = this.getFocusedTag(this.getListTags());
      if (focused) this.scrollTagIntoView(focused);
      this.scrollSelectionAfterRender = false;
    });
  }

  protected get listMode(): boolean {
    return this.stateService.settings?.filterMode === 'list';
  }

  protected setFilterMode(mode: 'tree' | 'list'): void {
    if (this.listMode === (mode === 'list')) return;
    this.stateService.settings.filterMode = mode;
    this.searchQuery = '';
    this.resetListSelection();
    this.serializationService.save();
  }

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
    this.resetListSelection();
    if (this.resultsContainer) this.resultsContainer.nativeElement.scrollTop = 0;
  }

  protected clearSearchQuery(input: HTMLInputElement): void {
    this.searchQuery = '';
    this.resetListSelection();
    input.value = '';
    input.focus();
  }

  protected hasSearchQuery(): boolean {
    return this.searchQuery.length > 0;
  }

  protected getListTags(): Tag[] {
    const results = this.tagService.tags.filter(tag => tag.matchesSearchQuery(this.searchQuery));
    this.tagService.sort(results, true);
    return results;
  }

  protected getFocusedTag(tags: Tag[]): Tag | undefined {
    return tags.find(tag => tag.id === this.focusedTagId) ?? tags[0];
  }

  protected onTagToggled(tag: Tag): void {
    this.focusedTagId = tag.id;
    this.searchInput?.nativeElement.focus();
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.isComposing || event.keyCode === 229 || event.ctrlKey || event.altKey || event.metaKey) return;
    if (!this.listMode || !['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();
    const tags = this.getListTags();
    const focused = this.getFocusedTag(tags);
    if (!focused) return;

    if (event.key === 'Enter') {
      if (!event.repeat) this.listRows.find(row => row.tag === focused)?.activate();
      return;
    }

    const index = tags.indexOf(focused);
    const nextIndex = Math.max(0, Math.min(tags.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    const nextTag = tags[nextIndex];
    this.focusedTagId = nextTag.id;
    this.scrollTagIntoView(nextTag);
  }

  protected clearFilters(): void {
    this.tagService.tags.forEach(tag => tag.state = 0);
    this.filterService.updateFilters();
    this.serializationService.save();
  }

  protected canClear(): boolean {
    return this.tagService.tags.some(tag => tag.state != 0);
  }

  private resetListSelection(): void {
    this.focusedTagId = null;
    this.scrollSelectionAfterRender = true;
  }

  private scrollTagIntoView(tag: Tag): void {
    const container = this.resultsContainer?.nativeElement;
    if (!container) return;
    const row = container.querySelector<HTMLElement>('#filter-list-result-' + tag.id);
    if (!row) return;

    const bounds = container.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    if (rowBounds.top < bounds.top) {
      container.scrollTop += rowBounds.top - bounds.top;
    } else if (rowBounds.bottom > bounds.bottom) {
      container.scrollTop += rowBounds.bottom - bounds.bottom;
    }
  }

}
