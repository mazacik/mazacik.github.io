
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { drawer } from 'src/app/shared/constants/animations.constants';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Article } from '../../models/article.class';
import { StoryManagerGoogleDriveService } from '../../services/story-manager-google-drive.service';
import { StoryManagerStateService } from '../../services/story-manager-state.service';
import { SidebarRowComponent } from "./sidebar-row/sidebar-row.component";

@Component({
  selector: 'app-sidebar',
  imports: [
    FormsModule,
    SidebarRowComponent
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  animations: [drawer]
})
export class SidebarComponent implements OnInit {

  protected searchQuery: string;
  protected searchResults: Article[] = [];

  constructor(
    protected googleService: StoryManagerGoogleDriveService,
    protected stateService: StoryManagerStateService
  ) { }

  ngOnInit(): void {

  }

  protected onSearchInputChange(element: HTMLInputElement): void {
    this.searchQuery = element.value;
    this.searchResults.length = 0;
    if (!StringUtils.isEmpty(this.searchQuery)) {
      for (const story of this.stateService.articles) {
        for (const note of story.children) {
          if (note.text.match(new RegExp(this.searchQuery, 'i'))) {
            ArrayUtils.push(this.searchResults, story);
          }
        }
      }
    }
  }

}
