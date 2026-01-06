import { GalleryImage } from "../../gallery/models/gallery-image.class";

export abstract class GalleryUtils {

  public static readonly thumbnailSkipThresholdBytes: number = 1024 * 1024;

  public static getPlaceholderSrc(image: GalleryImage): string {
    if (!image) return undefined;
    if (image.size != null && image.size < this.thumbnailSkipThresholdBytes) return undefined;
    return image.thumbnailLink;
  }

}
