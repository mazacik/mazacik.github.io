import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StoryManagerStateService } from '../../services/story-manager-state.service';
import { SidebarRowComponent } from "./sidebar-row/sidebar-row.component";

@Component({
  selector: 'app-sidebar',
  imports: [
    FormsModule,
    SidebarRowComponent
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {

  constructor(
    protected stateService: StoryManagerStateService
  ) { }

  protected onSearchInputChange(element: HTMLInputElement): void {
    this.stateService.searchQuery = element.value;
    this.stateService.searchResults.length = 0;
    if (!StringUtils.isEmpty(this.stateService.searchQuery)) {
      for (const article of this.stateService.collectArticles()) {
        if (!article.folder && article.text?.match(new RegExp(this.stateService.searchQuery, 'i'))) {
          ArrayUtils.push(this.stateService.searchResults, article);
        }
      }
    }
  }

}
