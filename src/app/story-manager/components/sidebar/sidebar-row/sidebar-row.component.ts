import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { Article } from 'src/app/story-manager/models/article.class';
import { StoryManagerGoogleDriveService } from 'src/app/story-manager/services/story-manager-google-drive.service';
import { StoryManagerStateService } from 'src/app/story-manager/services/story-manager-state.service';

@Component({
  selector: 'app-sidebar-row',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './sidebar-row.component.html',
  styleUrls: ['./sidebar-row.component.scss'],
  animations: [drawer2]
})
export class SidebarRowComponent implements OnInit {

  @Input() article: Article;

  constructor(
    protected googleService: StoryManagerGoogleDriveService,
    protected stateService: StoryManagerStateService
  ) { }

  ngOnInit(): void {

  }

  protected isHighlight(): boolean {
    return this.article.collectChildren().concat(this.article).some(a => a == this.stateService.current);
  }

  protected onClick(): void {
    if (this.article.folder) {
      this.stateService.current = this.article.children[0];
    } else {
      this.stateService.current = this.article;
    }
  }

}
