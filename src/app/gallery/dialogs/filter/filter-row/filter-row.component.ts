import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GalleryService } from 'src/app/gallery/gallery.service';
import { Tag } from 'src/app/gallery/model/tag.interface';
import { GalleryStateService } from 'src/app/gallery/services/gallery-state.service';
import { TagService } from 'src/app/gallery/services/tag.service';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { TagUtils } from 'src/app/shared/utils/tag.utils';

@Component({
  selector: 'app-filter-row',
  standalone: true,
  imports: [
    CommonModule
  ],
  animations: [drawer2],
  templateUrl: './filter-row.component.html',
  styleUrls: ['./filter-row.component.scss']
})
export class FilterRowComponent {

  @Input() tag: Tag;

  constructor(
    protected tagService: TagService,
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) { }

  protected onTagClick(): void {
    if (this.tag.children.length == 0) {
      this.toggleTagState();
    } else {
      this.tag.open = !this.tag.open;
    }
  }

  protected toggleTagState(): void {
    this.tag.state = this.tag.state == 0 ? 1 : this.tag.state == 1 ? -1 : 0;
    this.stateService.updateFilters();
    this.stateService.save();
  }

  protected getTextClass(): string {
    switch (this.tag.state) {
      case 1:
        return 'positive';
      case -1:
        return 'negative';
    }
  }

  protected getOffset(tag: Tag): number {
    let offset = TagUtils.getDepth(tag);
    if (!tag.parent && tag.children.length == 0) offset++;
    return offset;
  }

  protected isGroup(): boolean {
    return this.tag.children.length != 0;
  }

}
