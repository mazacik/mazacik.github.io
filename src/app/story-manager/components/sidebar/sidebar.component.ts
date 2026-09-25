import { Component } from '@angular/core';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StoryManagerStateService } from '../../services/story-manager-state.service';
import { SidebarRowComponent } from './sidebar-row/sidebar-row.component';

@Component({
  selector: 'app-sidebar',
  imports: [SidebarRowComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['../editor/editor.scss', './sidebar.component.scss'],
})
export class SidebarComponent {
  constructor(protected stateService: StoryManagerStateService) {}

  protected get visibleNotes() {
    return (this.stateService.storyFolder?.collectChildren() ?? this.stateService.getVisibleRoot() ?? []).filter((article) => !article.folder);
  }

  protected onSearchInputChange(element: HTMLInputElement): void {
    this.stateService.searchQuery = element.value;
    this.stateService.searchResults.length = 0;
    if (!StringUtils.isEmpty(this.stateService.searchQuery)) {
      const query = this.stateService.searchQuery.toLowerCase();
      for (const article of this.visibleNotes) {
        if (article.text?.toLowerCase().includes(query) || article.title.toLowerCase().includes(query)) {
          ArrayUtils.push(this.stateService.searchResults, article);
        }
      }
    }
  }

  protected onRootDragOver(event: DragEvent): void {
    if (this.stateService.setDropTarget(null, 'root')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected onRootDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.stateService.dropDraggedArticle();
  }
}
