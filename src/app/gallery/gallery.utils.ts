import { TippyService } from "@ngneat/helipopper";
import { GalleryImage } from "src/app/gallery/model/gallery-image.class";

export abstract class GalleryUtils {

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
