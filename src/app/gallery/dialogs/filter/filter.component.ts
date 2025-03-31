import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GalleryService } from '../../gallery.service';
import { Tag } from '../../model/tag.interface';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryTagEditorComponent } from '../gallery-tag-editor/gallery-tag-editor.component';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent extends DialogContent<boolean> implements OnInit {

  public configuration: DialogConfiguration = {
    title: 'Filter Configuration',
    buttons: [{
      text: () => 'OK',
      click: () => this.close()
    }],
    hideTopRightCloseButton: true
  };

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService,
    protected dialogService: DialogService
  ) {
    super();
  }

  ngOnInit(): void {

  }

  protected showHeartsFilter(): boolean {
    return this.stateService.images.some(image => image.heart);
  }

  protected showBookmarksFilter(): boolean {
    return this.stateService.images.some(image => image.bookmark);
  }

  protected showTagsFilter(): boolean {
    return this.stateService.images.some(image => !ArrayUtils.isEmpty(image.tagIds));
  }

  protected getTagBubbleClass(state: number, icon?: boolean): string {
    switch (state) {
      case 1:
        return 'positive ' + (icon ? 'fa-solid' : '');
      case -1:
        return 'negative ' + (icon ? 'fa-solid' : '');
      default:
        return icon ? 'fa-regular' : '';
    }
  }

  protected toggleHeartsFilter(backwards?: boolean): void {
    if (this.stateService.heartsFilter == (backwards ? -1 : 0)) {
      this.stateService.heartsFilter = 1;
    } else if (this.stateService.heartsFilter == (backwards ? 0 : 1)) {
      this.stateService.heartsFilter = -1;
    } else {
      this.stateService.heartsFilter = 0;
    }

    this.stateService.updateData();
    this.stateService.refreshFilter();
  }

  protected toggleBookmarksFilter(backwards?: boolean): void {
    if (this.stateService.bookmarksFilter == (backwards ? -1 : 0)) {
      this.stateService.bookmarksFilter = 1;
    } else if (this.stateService.bookmarksFilter == (backwards ? 0 : 1)) {
      this.stateService.bookmarksFilter = -1;
    } else {
      this.stateService.bookmarksFilter = 0;
    }

    this.stateService.updateData();
    this.stateService.refreshFilter();
  }

  protected toggleFilter(tag: Tag, backwards?: boolean): void {
    if (tag.state == (backwards ? -1 : 0)) {
      tag.state = 1;
    } else if (tag.state == (backwards ? 0 : 1)) {
      tag.state = -1;
    } else {
      tag.state = 0;
    }
    this.stateService.updateData();
    this.stateService.refreshFilter();
  }

  protected editTag(tag: Tag): void {
    this.dialogService.create(GalleryTagEditorComponent, { tag: tag });
  }

  protected clearFilters(): void {
    this.stateService.tags.forEach(tag => tag.state = 0);
    this.stateService.refreshFilter();
  }

  protected onTagMiddleClick(event: MouseEvent, tag: Tag): void {
    if (event.button == 1) {
      this.editTag(tag);
    }
  }

  @HostListener('window:keydown.enter', ['$event'])
  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    if (this.stateService.images) {
      this.stateService.refreshFilter();
      this.stateService.updateData();
    }
    this.resolve(true);
  }

}
