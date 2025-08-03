import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Tag } from 'src/app/gallery/models/tag.class';
import { GalleryStateService } from 'src/app/gallery/services/gallery-state.service';
import { GalleryService } from 'src/app/gallery/services/gallery.service';
import { TagDragDropService } from 'src/app/gallery/services/tag-drag-drop.service';
import { TagService } from 'src/app/gallery/services/tag.service';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-filter-row',
  standalone: true,
  imports: [CommonModule, VariableDirective],
  animations: [drawer2],
  templateUrl: './filter-row.component.html',
  styleUrls: ['./filter-row.component.scss'],
})
export class FilterRowComponent {

  @Input() tag: Tag;

  constructor(
    protected tagService: TagService,
    protected tagDragDropService: TagDragDropService,
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService,
  ) { }

  protected onTagClick(): void {
    if (this.tag.group) {
      this.tag.open = !this.tag.open;
    } else {
      this.toggleTagState();
    }
  }

  protected toggleTagState(): void {
    this.tag.state = this.tag.state == 0 ? 1 : this.tag.state == 1 ? -1 : 0;
    this.stateService.updateFilters();
    this.stateService.save();
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

  protected getTagGroups(): Tag[] {
    return this.tag.children.filter(t => t.group);
  }

  protected getTags(): Tag[] {
    return this.tag.children.filter(t => !t.group);
  }

  protected encryptSimple(value: string): string {
    return StringUtils.encryptSimple(value);
  }

}
