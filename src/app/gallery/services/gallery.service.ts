import { Injectable } from "@angular/core";
import { TippyService } from "@ngneat/helipopper";
import { DialogService } from "../../shared/services/dialog.service";
import { GroupManagerComponent } from "../dialogs/group-manager/group-manager.component";
import { GallerySettingsComponent } from "../dialogs/settings/gallery-settings.component";
import { GalleryGroup } from "../models/gallery-group.class";
import { GalleryImage } from "../models/gallery-image.class";
import { Tag } from "../models/tag.class";
import { TagManagerComponent } from "../dialogs/tag-manager/tag-manager.component";

@Injectable({
  providedIn: 'root',
})
export class GalleryService {

  public constructor(
    private dialogService: DialogService,
    private tippyService: TippyService
  ) { }

  public openFileInformation(image: GalleryImage): void {
    this.dialogService.createMessage({
      title: 'File Information',
      messages: [
        'File Name: ' + image.name,
        'File Type: ' + image.mimeType,
        'Resolution: ' + image.imageMediaMetadata.width + '×' + image.imageMediaMetadata.height
      ]
    });
  }

  public openImageGroupEditor(group?: GalleryGroup): void {
    this.dialogService.create(GroupManagerComponent, { sourceGroup: group });
  }

  public openSettings(): void {
    this.dialogService.create(GallerySettingsComponent);
  }

  public openTagOptions(tag: Tag): void {
    this.dialogService.create(TagManagerComponent, { tag: tag });
  }

  public openYandexReverseImageSearch(event: MouseEvent, target: GalleryImage): void {
    const url: string = 'https://yandex.com/images/search?rpt=imageview&url=' + encodeURIComponent(target.thumbnailLink.replace(new RegExp('=s...'), '=s9999'));
    if (event.altKey) {
      navigator.clipboard.writeText(url);
      this.tippyService.create(event.target as HTMLElement, 'URL copied to clipboard!', {
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
