import { Injectable } from "@angular/core";
import { nanoid } from 'nanoid';
import { DialogService } from "src/app/shared/services/dialog.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { ArticleOptionsComponent } from "../components/dialogs/story-options/story-options.component";
import { Article } from "../models/article.class";
import { StoryManagerSerializationService } from "./story-manager-serialization.service";

@Injectable({
  providedIn: 'root',
})
export class StoryManagerStateService {

  public articles: Article[];

  public current: Article;
  public searchQuery: string;
  public searchResults: Article[] = [];

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

  public async create(parent: Article, folder: boolean): Promise<void> {
    const title: string = await this.dialogService.createInput({ title: folder ? 'Create Folder' : 'Create Note', placeholder: 'Title' });
    if (title) {
      const article: Article = new Article();
      article.id = nanoid();
      article.title = title;
      article.text = '';
      article.children = [];
      article.parent = parent;
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

}
