import { SerializableArticle } from './serializable-article.interface';
import { Story, Playthrough } from './story.model';

export interface Data {
  articles: SerializableArticle[];
  version?: number;
  stories?: Story[];
  playthroughs?: Playthrough[];
  saveId?: string;
}
