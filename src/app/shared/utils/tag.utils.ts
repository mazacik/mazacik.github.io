import { GalleryImage } from "src/app/gallery/models/gallery-image.class";
import { Tag } from "src/app/gallery/models/tag.class";

export abstract class TagUtils {

  public static hasTag(image: GalleryImage, tag: Tag, deep: boolean = false): boolean {
    if (tag.group) {
      // group
      if (deep) {
        for (const child of tag.children) {
          if (!this.hasTag(image, child, deep)) {
            return false;
          }
        }
      }
    } else {
      if (tag.children.length == 0) {
        // tag
      } else {
        // pseudo
        if (deep) {

        } else {

        }
      }
    }
    return true;
  }

  public static sort(tags: Tag[], completeName: boolean = false): void {
    if (tags) {
      if (completeName) {
        tags.sort((t1, t2) => t1.getCompleteName().localeCompare(t2.getCompleteName()));
      } else {
        tags.sort((t1, t2) => t1.name.localeCompare(t2.name));
      }
    }

    // children?.sort((t1, t2) => {
    // if (t1.children.length && !t2.children.length) return -1;
    // if (!t1.children.length && t2.children.length) return 1;
    // return t1.name.localeCompare(t2.name);
    // });
  }

}
