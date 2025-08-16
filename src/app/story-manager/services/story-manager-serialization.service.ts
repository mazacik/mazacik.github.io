import { Injectable, Injector } from "@angular/core";
import { nanoid } from "nanoid";
import { Delay } from "src/app/shared/classes/delay.class";
import { ApplicationService } from "src/app/shared/services/application.service";
import { Article } from "../models/article.class";
import { Data } from "../models/data.interface";
import { SerializableArticle } from "../models/serializable-article.interface";
import { StoryManagerGoogleDriveService } from "./story-manager-google-drive.service";
import { StoryManagerStateService } from "./story-manager-state.service";

@Injectable({
  providedIn: 'root',
})
export class StoryManagerSerializationService {

  constructor(
    private injector: Injector,
    private applicationService: ApplicationService,
    private googleService: StoryManagerGoogleDriveService
  ) {
    this.applicationService.loading.set(true);
    this.load().finally(() => this.applicationService.loading.set(false));
  }

  private readonly saveDelay: Delay = new Delay(5000);
  public save(instant: boolean = false): void {
    this.applicationService.changes.set(true);
    this.saveDelay.restart(() => this._save());
    if (instant) this.saveDelay.complete();
  }

  private _save(): void {
    const data: Data = {} as Data;
    const stateService: StoryManagerStateService = this.injector.get(StoryManagerStateService);
    data.articles = stateService.articles.map(article => this.serializeArticle(article));
    this.googleService.update(data);
  }

  private serializeArticle(article: Article): SerializableArticle {
    const sa: SerializableArticle = {} as SerializableArticle;
    sa.id = article.id;
    sa.title = article.title;
    sa.text = article.text;
    sa.childIds = article.children.map(c => c.id);
    return sa;
  }

  private async load(): Promise<void> {
    const data: Data = await this.googleService.request();

    const stateService: StoryManagerStateService = this.injector.get(StoryManagerStateService);
    stateService.articles = data.articles.map(article => this.parseArticle(article));
    stateService.articles.forEach(a1 => a1.children = data.articles.find(a2 => a2.id == a1.id).childIds.map(cid => stateService.articles.find(a3 => a3.id == cid)));
    stateService.articles.forEach(a1 => a1.parent = stateService.articles.find(a2 => a2.children.includes(a1)));
  }

  private parseArticle(input: SerializableArticle): Article {
    const article: Article = new Article();
    article.id = input.id || nanoid();
    article.title = input.title;
    article.text = input.text;
    article.open = false;
    return article;
  }

}
