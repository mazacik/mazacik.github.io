import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GalleryTagEditorComponent } from '../dialogs/gallery-tag-editor/gallery-tag-editor.component';
import { ImageComparisonComponent } from '../dialogs/image-comparison/image-comparison.component';
import { GalleryService } from '../gallery.service';
import { Tag } from '../model/tag.interface';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    TippyDirective
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    protected dialogService: DialogService,
    protected galleryService: GalleryService
  ) { }

  protected openImageComparison(): void {
    this.dialogService.create(ImageComparisonComponent, { images: ArrayUtils.shuffle(this.stateService.images.slice()) });
  }

  protected getFilterTags(): Tag[] {
    return this.stateService.tags?.filter(tag => tag.state != 0);
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

  protected removeFilter(tag: Tag): void {
    tag.state = 0;
    this.stateService.updateData();
    this.stateService.refreshFilter();
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

  protected toggleFilter(tag: Tag): void {
    tag.state = tag.state * -1;
    this.stateService.updateData();
    this.stateService.refreshFilter();
  }

  protected tagMatch: Tag;
  protected onFilterInput(event: Event): void {
    const lowerCaseQueryCharacters: string = (event.target as HTMLInputElement).value.toLowerCase();
    if (lowerCaseQueryCharacters.length > 0) {
      for (const tag of this.stateService.tags) {
        if (tag.lowerCaseName.startsWith(lowerCaseQueryCharacters)) {
          this.tagMatch = tag;
          (event.target as HTMLInputElement).value = tag.name.substring(0, lowerCaseQueryCharacters.length);
          return;
        }
      }
    }

    this.tagMatch = null;
  }

  protected async onFilterInputSubmit(event?: KeyboardEvent): Promise<void> {
    if (!event || event.key === 'Enter') {
      const tagInput: HTMLInputElement = (document.getElementById('filter-input') as HTMLInputElement);
      if (!this.tagMatch) {
        this.tagMatch = await this.dialogService.create(GalleryTagEditorComponent, { tagName: tagInput.value });
      }

      if (this.tagMatch) {
        this.tagMatch.state = 1;
        this.tagMatch = null;
        tagInput.value = '';
        this.stateService.refreshFilter();
      }
    }
  }

  protected editTag(tag: Tag): void {
    this.dialogService.create(GalleryTagEditorComponent, { tag: tag });
  }

}
