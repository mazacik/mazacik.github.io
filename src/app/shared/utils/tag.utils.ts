import { Tag } from 'src/app/gallery/model/tag.interface';

export abstract class TagUtils {

  public static collectParents(tag: Tag, collector: Tag[] = []): Tag[] {
    if (tag.parent) {
      collector.unshift(tag.parent);
      TagUtils.collectParents(tag.parent, collector)
    }
    return collector;
  }

  public static collectChildren(tag: Tag, collector: Tag[] = []): Tag[] {
    if (tag.children.length > 0) {
      for (const child of tag.children) {
        collector.push(child);
        TagUtils.collectChildren(child, collector);
      }
    }
    return collector;
  }

  public static getCompleteName(tag: Tag, separator: string = ' - '): string {
    return this.collectParents(tag).concat(tag).map(t => t.name).join(separator);
  }

  public static getDepth(tag: Tag): number {
    return this.collectParents(tag).length;
  }

}