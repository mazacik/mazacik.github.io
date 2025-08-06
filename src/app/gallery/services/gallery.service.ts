import { Injectable } from "@angular/core";
import { TippyService } from "@ngneat/helipopper";
import { ApplicationService } from "src/app/shared/services/application.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { DialogService } from "../../shared/services/dialog.service";
import { GroupManagerComponent } from "../dialogs/group-manager/group-manager.component";
import { GallerySettingsComponent } from "../dialogs/settings/gallery-settings.component";
import { TagManagerComponent } from "../dialogs/tag-manager/tag-manager.component";
import { GalleryGroup } from "../models/gallery-group.class";
import { GalleryImage } from "../models/gallery-image.class";
import { Tag } from "../models/tag.class";
import { FilterService } from "./filter.service";
import { GalleryGoogleDriveService } from "./gallery-google-drive.service";
import { GalleryStateService } from "./gallery-state.service";
import { SerializationService } from "./serialization.service";

@Injectable({
  providedIn: 'root',
})
export class GalleryService {

  public constructor(
    private serializationService: SerializationService,
    private dialogService: DialogService,
    private tippyService: TippyService,
    private filterService: FilterService,
    private stateService: GalleryStateService,
    private applicationService: ApplicationService,
    private googleService: GalleryGoogleDriveService
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

  // TODO move dialog result functionality here
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

  public async delete(image: GalleryImage, archive: boolean, askForConfirmation: boolean = true): Promise<void> {
    if (askForConfirmation && !await this.dialogService.createConfirmation({ title: 'Confirmation', messages: ['Are you sure you want to ' + (archive ? 'archive' : 'delete') + ' this image?'] })) {
      return;
    }

    this.applicationService.loading.set(true);

    if (archive) {
      await this.googleService.move(image.id, image.parentFolderId, this.stateService.archiveFolderId);
    } else {
      await this.googleService.trash(image.id);
    }

    ArrayUtils.remove(this.stateService.images, this.stateService.images.find(i => i.id == image.id));

    let nextTarget: GalleryImage = null;

    if (image.group) {
      const index: number = image.group.images.indexOf(image);
      nextTarget = image.group.images[index + 1] || image.group.images[index - 1];

      if (image.group.images.length > 2) {
        ArrayUtils.remove(image.group.images, image);
      } else {
        ArrayUtils.remove(this.stateService.imageGroups, image.group);
        for (const groupImage of image.group.images) {
          delete groupImage.group;
        }
      }
    }

    if (this.stateService.comparison != null) {
      for (const imageIds of Object.values(this.stateService.comparison)) {
        if (imageIds.includes(image.id)) {
          ArrayUtils.remove(imageIds, image.id);
        }
      }
    }

    this.filterService.images.set(this.stateService.images.filter(image => image.passesFilters));
    this.stateService.fullscreenImage.set(nextTarget);

    this.serializationService.save(true);
    this.applicationService.loading.set(false);
  }

  public toggleFavorite(image: GalleryImage): void {
    image.heart = !image.heart;
    this.filterService.updateFilters(image);
    this.serializationService.save();
  }

  public toggleBookmark(image: GalleryImage): void {
    image.bookmark = !image.bookmark;
    this.filterService.updateFilters(image);
    this.serializationService.save();
  }

}
