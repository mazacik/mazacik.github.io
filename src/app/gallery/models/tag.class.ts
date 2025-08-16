import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { Filter } from "./filter.interface";
import { GalleryImage } from "./gallery-image.class";

export class Tag implements Filter {

  id: string;
  name: string;
  group: boolean;
  state: number;
  parent: Tag;
  children: Tag[];
  open: boolean;

  public get pseudo(): boolean {
    return !this.group && this.children.length != 0;
  }

  public getNameWithParents(separator: string = ' | '): string {
    return this.collectParents().concat(this).map(t => t.name).join(separator);
  }

  public getCount(images: GalleryImage[]): number {
    if (this.group) return null;
    if (this.pseudo) return images.filter(image => ArrayUtils.intersection(image.tags, this.children).length).length;
    return images.filter(image => image.tags.includes(this)).length;
  }

  public collectParents(): Tag[] {
    return this._collectParents(this, []);
  }

  private _collectParents(tag: Tag, collector: Tag[]): Tag[] {
    if (tag.parent) {
      collector.unshift(tag.parent);
      this._collectParents(tag.parent, collector)
    }
    return collector;
  }

  public collectChildren(): Tag[] {
    return this._collectChildren(this, []);
  }

  private _collectChildren(tag: Tag, collector: Tag[]): Tag[] {
    if (tag.group) {
      for (const child of tag.children) {
        collector.push(child);
        this._collectChildren(child, collector);
      }
    }
    return collector;
  }

}
