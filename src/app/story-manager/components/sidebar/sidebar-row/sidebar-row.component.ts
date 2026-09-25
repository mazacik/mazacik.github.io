import { Component, Input } from '@angular/core';
import { Article } from 'src/app/story-manager/models/article.class';
import { ArticleDropPosition, StoryManagerStateService } from 'src/app/story-manager/services/story-manager-state.service';

@Component({
  selector: 'app-sidebar-row',
  templateUrl: './sidebar-row.component.html',
  styleUrls: ['./sidebar-row.component.scss'],
})
export class SidebarRowComponent {
  @Input() article: Article;

  constructor(protected stateService: StoryManagerStateService) {}

  protected isCurrent(): boolean {
    return this.article === this.stateService.current;
  }

  protected isSearchResult(): boolean {
    return this.stateService.searchResults.includes(this.article);
  }

  protected onClick(): void {
    this.stateService.current = this.article;
  }

  protected openOptions(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.stateService.options(this.article);
  }

  protected onDragStart(event: DragEvent): void {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', this.article.id);
    this.stateService.startDrag(this.article);
  }

  protected onDragOver(event: DragEvent): void {
    event.stopPropagation();

    const position: ArticleDropPosition = this.getDropPosition(event);
    if (this.stateService.setDropTarget(this.article, position)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.stateService.dropDraggedArticle();
  }

  protected onDragEnd(event: DragEvent): void {
    event.stopPropagation();
    this.stateService.clearDrag();
  }

  protected isDraggingThis(): boolean {
    return this.stateService.draggedArticle == this.article;
  }

  protected isDropPosition(position: ArticleDropPosition): boolean {
    return this.stateService.dropTarget == this.article && this.stateService.dropPosition == position;
  }

  private getDropPosition(event: DragEvent): ArticleDropPosition {
    const element: HTMLElement = event.currentTarget as HTMLElement;
    const rect: DOMRect = element.getBoundingClientRect();
    const offset: number = (event.clientY - rect.top) / rect.height;

    return offset < 0.5 ? 'before' : 'after';
  }
}
