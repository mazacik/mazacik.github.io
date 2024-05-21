import { GalleryImage } from "src/app/gallery/model/gallery-image.class";
import { ArrayUtils } from "../shared/utils/array.utils";

export abstract class MasonryUtils {

  public static getNearestImageUp(images: GalleryImage[], image: GalleryImage): GalleryImage {
    let index: number = images.indexOf(image);
    while (index > 0) {
      if (images[--index].left == image.left) return images[index];
    }
    return ArrayUtils.getLast(images.filter(_image => _image.left == image.left));
  }

  public static getNearestImageRight(masonryImages: GalleryImage[], startImage: GalleryImage): GalleryImage {
    const currentImageCenter: number = startImage.top + startImage.height * 0.5;

    const columnStarts: number[] = [...new Set(masonryImages.flatMap(image => image.left))]; // TODO only changes on layout update
    const currentColumnIndex: number = columnStarts.indexOf(startImage.left);

    const columnToSearchIndex: number = currentColumnIndex == columnStarts.length - 1 ? 0 : currentColumnIndex + 1;
    const columnToSearchStart: number = columnStarts[columnToSearchIndex];

    const columnToSearchImages: GalleryImage[] = masonryImages.filter(image => image.left == columnToSearchStart); // TODO only changes on layout update
    const imageToRight: GalleryImage = columnToSearchImages.find(image => image.top < currentImageCenter && image.top + image.height > currentImageCenter);
    return imageToRight || ArrayUtils.getLast(columnToSearchImages);
  }

  public static getNearestImageDown(images: GalleryImage[], image: GalleryImage): GalleryImage {
    let index: number = images.indexOf(image);
    while (index < images.length - 1) {
      if (images[++index].left == image.left) return images[index];
    }
    return ArrayUtils.getFirst(images.filter(_image => _image.left == image.left));
  }

  public static getNearestImageLeft(images: GalleryImage[], image: GalleryImage): GalleryImage {
    const currentImageMiddle: number = image.top + image.height * 0.5;

    const columnStarts: number[] = [...new Set(images.flatMap(image => image.left))]; // TODO only changes on layout update
    const currentColumnIndex: number = columnStarts.indexOf(image.left);

    const columnToSearchIndex: number = currentColumnIndex == 0 ? columnStarts.length - 1 : currentColumnIndex - 1;
    const columnToSearchStart: number = columnStarts[columnToSearchIndex];

    const columnToSearchImages: GalleryImage[] = images.filter(image => image.left == columnToSearchStart); // TODO only changes on layout update
    const imageToLeft: GalleryImage = columnToSearchImages.find(image => image.top < currentImageMiddle && image.top + image.height > currentImageMiddle);
    return imageToLeft || ArrayUtils.getLast(columnToSearchImages);
  }

}
