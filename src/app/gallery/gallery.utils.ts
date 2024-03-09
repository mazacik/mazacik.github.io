import { GalleryImage } from "src/app/gallery/model/gallery-image.class";
import { ArrayUtils } from "../shared/utils/array.utils";

export abstract class GalleryUtils {

  public static getNearestImageUp(image: GalleryImage, images: GalleryImage[]): GalleryImage {
    let index: number = images.indexOf(image);
    while (index > 0) {
      if (images[--index].left == image.left) return images[index];
    }
    return ArrayUtils.getFirst(images);
  }

  public static getNearestImageRight(image: GalleryImage, images: GalleryImage[]): GalleryImage {
    return images[images.indexOf(image) + 1] || ArrayUtils.getLast(images);
  }

  public static getNearestImageDown(image: GalleryImage, images: GalleryImage[]): GalleryImage {
    let index: number = images.indexOf(image);
    while (index < images.length - 1) {
      if (images[++index].left == image.left) return images[index];
    }
    return ArrayUtils.getLast(images);
  }

  public static getNearestImageLeft(image: GalleryImage, images: GalleryImage[]): GalleryImage {
    return images[images.indexOf(image) - 1] || ArrayUtils.getFirst(images);
  }

}
