export class Article {
  id: string;
  title: string;
  text: string;
  children: Article[];
  folder: boolean;

  // transient
  parent: Article;
  open: boolean;

  public getNameWithParents(separator: string = ' | '): string {
    return this.collectParents().concat(this).map(t => t.title).join(separator);
  }

  public collectParents(): Article[] {
    return this._collectParents(this, []);
  }

  private _collectParents(article: Article, collector: Article[]): Article[] {
    if (article.parent) {
      collector.unshift(article.parent);
      this._collectParents(article.parent, collector)
    }
    return collector;
  }

  public collectChildren(): Article[] {
    return this._collectChildren(this, []);
  }

  private _collectChildren(article: Article, collector: Article[]): Article[] {
    if (article.children.length) {
      for (const child of article.children) {
        collector.push(child);
        this._collectChildren(child, collector);
      }
    }
    return collector;
  }
}
