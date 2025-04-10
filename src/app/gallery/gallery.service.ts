import { Injectable } from "@angular/core";
import { TippyService } from "@ngneat/helipopper";
import { DialogService } from "../shared/services/dialog.service";
import { ArrayUtils } from "../shared/utils/array.utils";
import { FilterComponent } from "./dialogs/filter/filter.component";
import { GalleryTagEditorComponent } from "./dialogs/gallery-tag-editor/gallery-tag-editor.component";
import { GroupEditorComponent } from "./dialogs/group-editor/group-editor.component";
import { ImageComparisonComponent } from "./dialogs/image-comparison/image-comparison.component";
import { GallerySettingsComponent } from "./dialogs/settings/gallery-settings.component";
import { GalleryGroup } from "./model/gallery-group.class";
import { GalleryImage } from "./model/gallery-image.class";
import { Tag } from "./model/tag.interface";
import { GalleryStateService } from "./services/gallery-state.service";
import { TagManagerComponent } from "./dialogs/tag-manager/tag-manager.component";

@Injectable({
  providedIn: 'root',
})
export class GalleryService {

  public constructor(
    private dialogService: DialogService,
    private stateService: GalleryStateService,
    private tippyService: TippyService
  ) { }

  public openImageComparison(): void {
    this.dialogService.create(ImageComparisonComponent, { images: ArrayUtils.shuffle(this.stateService.images.slice()) });
  }

  public openGroupEditor(group?: GalleryGroup): void {
    this.dialogService.create(GroupEditorComponent, { sourceGroup: group });
  }

  public openFilter(): void {
    this.dialogService.create(FilterComponent);
  }

  public openSettings(): void {
    this.dialogService.create(GallerySettingsComponent);
  }

  public openTagEditor(tag?: Tag): void {
    this.dialogService.create(GalleryTagEditorComponent, { tag: tag });
  }

  public openTagManager(image: GalleryImage): void {
    this.dialogService.create(TagManagerComponent, { image: image });
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
