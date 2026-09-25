import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChild, ViewChildren, afterEveryRender, effect } from '@angular/core';
import { GalleryGroup } from '../../models/gallery-group.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { Tag } from '../../models/tag.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';
import { TaggerRowComponent } from './tagger-row/tagger-row.component';

@Component({
  selector: 'app-tagger',
  imports: [CommonModule, TaggerRowComponent, ImageComponent],
  templateUrl: './tagger.component.html',
  styleUrls: ['./tagger.component.scss']
})
export class TaggerComponent {

  protected target: GalleryImage;
  protected groupMode: boolean = false;
  protected searchQuery: string = '';
  protected currentGroup: GalleryGroup;
  protected groupTracker = 0;
  private focusedListTagId: string | null = null;

  private scrollSelectionAfterRender = false;

  private searchInput: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') private set searchInputElement(input: ElementRef<HTMLInputElement>) {
    this.searchInput = input;
    input?.nativeElement.focus();
  }
  @ViewChild('appliedContainer') private appliedContainer: ElementRef<HTMLElement>;
  @ViewChild('resultsContainer') private resultsContainer: ElementRef<HTMLElement>;
  @ViewChildren('listRow') private listRows: QueryList<TaggerRowComponent>;

  constructor(
    protected tagService: TagService,
    protected galleryService: GalleryService,
    protected googleService: GalleryGoogleDriveService,
    protected stateService: GalleryStateService,
    private serializationService: GallerySerializationService
  ) {
    effect(() => {
      this.target = this.stateService.fullscreenImage();
      this.resetSearchSelection();
      if (this.target == null || !this.target.group) {
        this.groupMode = false;
        if (this.target == null) {
          return;
        }
      }

      if (this.currentGroup != this.target.group) {
        this.currentGroup = this.target.group;
        this.groupTracker++;
      }
    });
    afterEveryRender(() => {
      if (this.scrollSelectionAfterRender) {
        const tags = this.getListTags();
        const focused = this.getFocusedListTag(tags);
        if (focused) this.scrollListTagIntoView(focused, tags);
        this.scrollSelectionAfterRender = false;
      }
    });
  }

  protected get listMode(): boolean {
    return this.stateService.settings?.taggerMode === 'list';
  }

  protected setTaggerMode(mode: 'tree' | 'list'): void {
    if (this.listMode === (mode === 'list')) return;
    this.stateService.settings.taggerMode = mode;
    this.searchQuery = '';
    this.resetSearchSelection();
    this.serializationService.save();
  }

  protected toggleGroupMode(): void {
    this.groupMode = !this.groupMode;
    this.resetSearchSelection();
    this.searchInput?.nativeElement.focus();
  }

  private resetSearchSelection(): void {
    this.focusedListTagId = null;
    this.scrollSelectionAfterRender = true;
  }

  protected getListTags(): { applied: Tag[]; unapplied: Tag[] } {
    const applied: Tag[] = [];
    const unapplied: Tag[] = [];
    if (!this.listMode) return { applied, unapplied };
    const images = this.groupMode && this.target?.group ? this.target.group.images : this.target ? [this.target] : [];
    const membership = new Set(images.flatMap(image => image.tags));
    for (const tag of this.tagService.searchTags('')) {
      if (tag.pseudo) continue;
      if (membership.has(tag)) applied.push(tag);
      else if (tag.matchesSearchQuery(this.searchQuery)) unapplied.push(tag);
    }
    const query = this.searchQuery.trim().toLocaleLowerCase();
    // Stable sort preserves alphabetical full-path ordering within each tier.
    unapplied.sort((a, b) => Number(b.name.toLocaleLowerCase().startsWith(query)) - Number(a.name.toLocaleLowerCase().startsWith(query)));
    return { applied, unapplied };
  }

  protected getFileSize(image: GalleryImage): string | null {
    const size: number = Number(image?.size);
    if (!image || Number.isNaN(size)) return null;
    const kilobytes: number = size / 1024;
    return kilobytes.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' KB';
  }

  protected getFileType(image: GalleryImage): string | null {
    if (!image) {
      return null;
    }

    const extension: string | undefined = image.name?.split('.').pop()?.trim().toLowerCase();
    if (extension && extension !== image.name?.trim().toLowerCase()) {
      return extension.toUpperCase();
    }

    const mimeTypePart: string | undefined = image.mimeType?.split('/').pop()?.trim().toLowerCase();
    return mimeTypePart?.toUpperCase() || null;
  }

  protected getResolution(image: GalleryImage): string | null {
    if (image?.imageMediaMetadata?.width && image?.imageMediaMetadata?.height) {
      return image.imageMediaMetadata.width + ' x ' + image.imageMediaMetadata.height;
    }

    if (image?.videoMediaMetadata?.width && image?.videoMediaMetadata?.height) {
      return image.videoMediaMetadata.width + ' x ' + image.videoMediaMetadata.height;
    }

    return null;
  }

  protected onNoteInput(event: Event): void {
    if (!this.target) {
      return;
    }

    const note: string = (event.target as HTMLInputElement)?.value ?? '';
    if (this.target.note === note) {
      return;
    }

    this.galleryService.updateNote(this.target, note);
  }

  protected onSearchQueryInput(event: Event): void {
    this.searchQuery = ((event.target as HTMLInputElement)?.value ?? '').trim();
    this.resetSearchSelection();
    if (this.resultsContainer) this.resultsContainer.nativeElement.scrollTop = 0;
  }

  protected clearSearchQuery(input: HTMLInputElement): void {
    this.searchQuery = '';
    this.resetSearchSelection();
    input.value = '';
    input.focus();
  }

  protected onSearchResultTagToggled(event: MouseEvent | KeyboardEvent): void {
    if (!event.shiftKey) {
      this.searchQuery = '';
    }
    this.resetSearchSelection();
    this.searchInput?.nativeElement.focus();
  }

  protected onAppliedTagToggled(): void {
    this.resetSearchSelection();
    this.searchInput?.nativeElement.focus();
  }

  protected hasSearchQuery(): boolean {
    return this.searchQuery.length > 0;
  }

  protected getFocusedListTag(tags: { applied: Tag[]; unapplied: Tag[] }): Tag | undefined {
    return [...tags.applied, ...tags.unapplied].find(tag => tag.id === this.focusedListTagId)
      ?? tags.unapplied[0]
      ?? tags.applied[0];
  }

  protected getListTagId(tag: Tag, tags: { applied: Tag[]; unapplied: Tag[] }): string {
    return (tags.applied.includes(tag) ? 'tagger-applied-tag-' : 'tagger-search-result-') + tag.id;
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.isComposing || event.keyCode === 229 || event.ctrlKey || event.altKey || event.metaKey) return;
    if (!this.listMode || !['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();
    const listTags = this.getListTags();
    const tags = [...listTags.applied, ...listTags.unapplied];
    const focused = this.getFocusedListTag(listTags);
    if (!focused) return;

    if (event.key === 'Enter') {
      if (!event.repeat && this.target) {
        this.listRows.find(row => row.tag === focused)?.activate(event);
      }
      return;
    }

    const index = tags.indexOf(focused);
    const nextIndex = Math.max(0, Math.min(tags.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    const nextTag = tags[nextIndex];
    this.focusedListTagId = nextTag.id;
    this.scrollListTagIntoView(nextTag, listTags);
  }

  private scrollListTagIntoView(tag: Tag, tags: { applied: Tag[]; unapplied: Tag[] }): void {
    const container = (tags.applied.includes(tag) ? this.appliedContainer : this.resultsContainer)?.nativeElement;
    if (!container) return;
    const row = container.querySelector<HTMLElement>('#' + this.getListTagId(tag, tags));
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
