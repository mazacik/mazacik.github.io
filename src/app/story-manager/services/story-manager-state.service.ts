import { Injectable } from "@angular/core";
import { nanoid } from 'nanoid';
import { DialogService } from "src/app/shared/services/dialog.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { ArticleOptionsComponent } from "../components/dialogs/story-options/story-options.component";
import { Article } from "../models/article.class";
import { StoryManagerSerializationService } from "./story-manager-serialization.service";

export type ArticleDropPosition = 'before' | 'inside' | 'after' | 'root';

@Injectable({
  providedIn: 'root',
})
export class StoryManagerStateService {

  public articles: Article[];

  public current: Article;
  public searchQuery: string;
  public searchResults: Article[] = [];
  public draggedArticle: Article;
  public dropTarget: Article;
  public dropPosition: ArticleDropPosition;

  constructor(
    private dialogService: DialogService,
    private serializationService: StoryManagerSerializationService
  ) { }

  public getRoot(): Article[] {
    return this.articles?.filter(article => !article.parent);
  }

  public collectArticles(): Article[] {
    const articles = [];
    for (const article of this.articles) {
      articles.push(article);
      articles.push(...article.collectChildren());
    }    
    return articles;
  }

  public save(instant: boolean = false): void {
    this.serializationService.save(instant);
  }

  public startDrag(article: Article): void {
    this.draggedArticle = article;
    this.clearDropTarget();
  }

  public clearDrag(): void {
    this.draggedArticle = null;
    this.clearDropTarget();
  }

  public setDropTarget(target: Article, position: ArticleDropPosition): boolean {
    if (!this.canDrop(target, position)) {
      this.clearDropTarget();
      return false;
    }

    this.dropTarget = target;
    this.dropPosition = position;
    return true;
  }

  public clearDropTarget(): void {
    this.dropTarget = null;
    this.dropPosition = null;
  }

  public canDrop(target: Article, position: ArticleDropPosition): boolean {
    if (!this.draggedArticle) {
      return false;
    }

    const destination = this.getDropDestination(target, position);
    if (!destination) {
      return false;
    }

    return this.canMoveArticle(this.draggedArticle, destination.parent);
  }

  public dropDraggedArticle(): boolean {
    if (!this.draggedArticle || !this.dropPosition) {
      return false;
    }

    const destination = this.getDropDestination(this.dropTarget, this.dropPosition);
    if (!destination) {
      return false;
    }

    const moved: boolean = this.moveArticle(this.draggedArticle, destination.parent, destination.index);
    this.clearDrag();
    return moved;
  }

  public moveArticle(article: Article, nextParent: Article, nextIndex?: number): boolean {
    if (!this.canMoveArticle(article, nextParent)) {
      return false;
    }

    const currentParent: Article = article.parent ?? null;
    const currentIndex: number = this.getSiblingIndex(article);
    const currentSiblings: Article[] = currentParent?.children;
    const nextSiblings: Article[] = nextParent?.children;
    let insertionIndex: number = nextIndex;

    if (currentParent) {
      ArrayUtils.remove(currentSiblings, article);
    }

    if (currentParent == nextParent && currentIndex < insertionIndex) {
      insertionIndex--;
    }

    article.parent = nextParent ?? null;

    if (nextParent) {
      insertionIndex = this.normalizeIndex(insertionIndex, nextSiblings.length);
      nextSiblings.splice(insertionIndex, 0, article);
      nextParent.open = true;
    } else {
      insertionIndex = this.normalizeIndex(insertionIndex, this.getRoot().filter(root => root != article).length);
      this.insertRootArticle(article, insertionIndex);
    }

    const moved: boolean = currentParent != article.parent || currentIndex != this.getSiblingIndex(article);
    if (moved) {
      this.serializationService.save(true);
    }

    return moved;
  }

  public async create(parent: Article | null, folder: boolean): Promise<void> {
    const title: string = await this.dialogService.createInput({ title: folder ? 'Create Folder' : 'Create Note', placeholder: 'Title' });
    if (title) {
      const article: Article = new Article();
      article.id = nanoid();
      article.title = title;
      article.text = '';
      article.children = [];
      article.parent = parent as Article;
      article.parent?.children.push(article);
      article.folder = folder;

      this.articles.push(article);
      this.serializationService.save(true);
    }
  }

  public rename(article: Article): void {
    this.dialogService.createInput({ title: 'Rename: ' + article.getNameWithParents(), placeholder: 'Text', defaultValue: article.title }).then(title => {
      if (!StringUtils.isEmpty(title)) {
        article.title = title;
        this.serializationService.save(true);
      }
    });
  }

  public delete(article: Article): void {
    this.dialogService.createConfirmation({ title: 'Delete: ' + article.getNameWithParents(), messages: ['Are you sure you want to delete "' + article.title + '"?'] }).then(confirmation => {
      if (confirmation) {
        const articlesToDelete: Article[] = this.collectArticleTree(article);
        const deletedArticleSet: Set<Article> = new Set(articlesToDelete);

        if (deletedArticleSet.has(this.current)) {
          this.current = ArrayUtils.nearestRightFirst(this.articles, this.articles.indexOf(article), candidate => !deletedArticleSet.has(candidate));
        }

        ArrayUtils.remove(this.articles, articlesToDelete);
        ArrayUtils.remove(this.searchResults, articlesToDelete);
        ArrayUtils.remove(article.parent?.children, article);
        this.serializationService.save(true);
      }
    });
  }

  private collectArticleTree(article: Article): Article[] {
    return [article, ...article.collectChildren()];
  }

  public options(article: Article): void {
    this.dialogService.create(ArticleOptionsComponent, { article: article });
  }

  private canMoveArticle(article: Article, nextParent: Article): boolean {
    if (!article) {
      return false;
    }

    if (nextParent && !nextParent.folder) {
      return false;
    }

    if (article == nextParent) {
      return false;
    }

    if (nextParent && article.folder && article.collectChildren().includes(nextParent)) {
      return false;
    }

    return true;
  }

  private getDropDestination(target: Article, position: ArticleDropPosition): { parent: Article, index: number } {
    if (position == 'root') {
      return { parent: null, index: this.getRoot().length };
    }

    if (!target) {
      return null;
    }

    if (position == 'inside') {
      if (!target.folder) {
        return null;
      }

      return { parent: target, index: target.children.length };
    }

    const parent: Article = target.parent ?? null;
    const siblings: Article[] = parent?.children ?? this.getRoot();
    const targetIndex: number = siblings.indexOf(target);

    if (targetIndex == -1) {
      return null;
    }

    return {
      parent: parent,
      index: targetIndex + (position == 'after' ? 1 : 0)
    };
  }

  private getSiblingIndex(article: Article): number {
    return article.parent ? article.parent.children.indexOf(article) : this.getRoot().indexOf(article);
  }

  private normalizeIndex(index: number, max: number): number {
    if (!Number.isInteger(index)) {
      return max;
    }

    return Math.min(Math.max(index, 0), max);
  }

  private insertRootArticle(article: Article, index: number): void {
    ArrayUtils.remove(this.articles, article);

    const roots: Article[] = this.getRoot().filter(root => root != article);
    const nextRoot: Article = roots[index];

    if (nextRoot) {
      this.articles.splice(this.articles.indexOf(nextRoot), 0, article);
    } else {
      this.articles.push(article);
    }
  }

}
