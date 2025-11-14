import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { Article } from 'src/app/story-manager/models/article.class';
import { StoryManagerGoogleDriveService } from 'src/app/story-manager/services/story-manager-google-drive.service';
import { StoryManagerStateService } from 'src/app/story-manager/services/story-manager-state.service';

@Component({
    selector: 'app-sidebar-row',
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

  // TODO drag in root makes open button not work first time

  private static object: Article;
  private static array: Article[];
  private static index: number;

  public start(event: DragEvent, target: Article): void {
    console.log('start: ' + target.title);

    event.dataTransfer.setDragImage(new Image(), 0, 0);

    SidebarRowComponent.object = target;
    if (target.parent) {
      SidebarRowComponent.array = target.parent.children;
      SidebarRowComponent.index = target.parent.children.indexOf(target);
    } else {
      const root: Article[] = this.stateService.articles;
      SidebarRowComponent.array = root;
      SidebarRowComponent.index = root.indexOf(target);
    }
  }

  public enter(event: DragEvent, target: Article): void {
    console.log('enter: ' + target.title);

    if (!target.parent || target.parent.children == SidebarRowComponent.array) {
      ArrayUtils.move(SidebarRowComponent.array, SidebarRowComponent.object, SidebarRowComponent.array.indexOf(target));
    }
  }

  public leave(event: DragEvent, target: Article): void {
    console.log('leave: ' + target.title);
  }

  public drop(event: DragEvent, target: Article): void {
    console.log('drop: ' + target.title);

    if (SidebarRowComponent.array.indexOf(SidebarRowComponent.object) != SidebarRowComponent.index) {
      this.stateService.save();
    }

    SidebarRowComponent.object = null;
    SidebarRowComponent.array = null;
    SidebarRowComponent.index = null;
  }

  public end(event: DragEvent, target: Article): void {
    console.log('end: ' + target.title);

    if (SidebarRowComponent.object) {
      ArrayUtils.move(SidebarRowComponent.array, SidebarRowComponent.object, SidebarRowComponent.index);
    }
  }

  protected isDraggingSome(): boolean {
    return SidebarRowComponent.object != null;
  }

  protected isDraggingThis(): boolean {
    return SidebarRowComponent.object == this.article;
  }

}
