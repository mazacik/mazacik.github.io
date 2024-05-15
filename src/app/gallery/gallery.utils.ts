import { TippyService } from "@ngneat/helipopper";
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

  // TODO this doesn't work with masonry
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

  // TODO this doesn't work with masonry
  public static getNearestImageLeft(image: GalleryImage, images: GalleryImage[]): GalleryImage {
    return images[images.indexOf(image) - 1] || ArrayUtils.getFirst(images);
  }

  public static openYandexReverseImageSearch(event: MouseEvent, target: GalleryImage, tippyService?: TippyService): void {
    const url: string = 'https://yandex.com/images/search?rpt=imageview&url=' + encodeURIComponent(target.thumbnailLink.replace(new RegExp('=s...'), '=s9999'));
    if (event.altKey) {
      navigator.clipboard.writeText(url);
      tippyService.create(event.target as HTMLElement, 'URL copied to clipboard!', {
        trigger: 'click',
        onShow(instance) {
          setTimeout(() => {
            instance.hide();
          }, 3000);
        },
        onHidden(instance) {
          instance.destroy();
        }
      }).show();
    } else {
      window.open(url, '_blank');
    }
  }

}
