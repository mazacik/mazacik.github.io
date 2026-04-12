import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Tag } from 'src/app/gallery/models/tag.class';
import { FilterService } from 'src/app/gallery/services/filter.service';
import { GallerySerializationService } from 'src/app/gallery/services/gallery-serialization.service';
import { GalleryStateService } from 'src/app/gallery/services/gallery-state.service';
import { GalleryService } from 'src/app/gallery/services/gallery.service';

@Component({
  selector: 'app-filter-search-row',
  imports: [CommonModule],
  templateUrl: './filter-search-row.component.html',
  styleUrls: ['./filter-search-row.component.scss']
})
export class FilterSearchRowComponent {

  @Input() tag: Tag;

  constructor(
    private filterService: FilterService,
    private serializationService: GallerySerializationService,
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) { }

  protected toggleTagState(): void {
    this.tag.state = this.tag.state == 0 ? 1 : this.tag.state == 1 ? -1 : 0;
    this.filterService.updateFilters();
    this.serializationService.save();
  }

  protected getTextClass(): string {
    const classes: string[] = [];

    if (this.tag.state == 1) {
      classes.push('positive');
    } else if (this.tag.state == -1) {
      classes.push('negative');
    }

    if (this.tag.collectChildren().some(t => t.state)) {
      classes.push('underline-dashed');
    }

    return classes.join(' ');
  }

  protected openOptions(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.galleryService.openTagOptions(this.tag);
  }

}
