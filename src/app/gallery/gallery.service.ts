import { Injectable } from "@angular/core";
import { TippyService } from "@ngneat/helipopper";
import { DialogButton } from "../shared/components/dialog/dialog-button.class";
import { DialogService } from "../shared/services/dialog.service";
import { ArrayUtils } from "../shared/utils/array.utils";
import { GroupOrderComponent } from "./dialogs/group-order/group-order.component";
import { GalleryGroup } from "./model/gallery-group.class";
import { GalleryImage } from "./model/gallery-image.class";
import { GalleryStateService } from "./services/gallery-state.service";

@Injectable({
  providedIn: 'root',
})
export class GalleryService {

  public constructor(
    private stateService: GalleryStateService,
    private dialogService: DialogService,
    private tippyService: TippyService
  ) { }

  public editGroup(image?: GalleryImage): void {
    let open: boolean;
    if (image) {
      if (image.group) {
        open = image.group.open;
        image.group.open = true;
        image.group.images.forEach(image => this.stateService.refreshFilter(image));
        this.stateService.editingGroup = image.group;
        this.stateService.editingGroupImages = image.group.images.slice();
      } else {
        this.stateService.editingGroup = null;
        this.stateService.editingGroupImages = [image];
      }
    } else {
      this.stateService.editingGroup = null;
      this.stateService.editingGroupImages = [];
    }

    this.stateService.refreshFilter();

    const buttons: DialogButton[] = [{ text: () => 'Save Group: ' + this.stateService.editingGroupImages?.length + ' images', resolveValue: true }, { iconClass: () => 'fa-solid fa-times' }];
    this.dialogService.create<boolean>(null, { buttons: buttons }, false, 'bottom').then(success => {
      if (success) {
        if (this.stateService.editingGroupImages.length > 1) {
          if (image?.group) {
            image.group.images.forEach(image => image.group = null);
            image.group.images = this.stateService.editingGroupImages;
            image.group.images.forEach(image => image.group = image.group);
          } else {
            const group: GalleryGroup = new GalleryGroup();
            group.images = this.stateService.editingGroupImages;
            group.images.forEach(image => image.group = group);
            this.stateService.groups.push(group);
          }

          this.stateService.updateData();
        } else {
          if (image?.group) {
            image.group.images.forEach(image => image.group = null);
            ArrayUtils.remove(this.stateService.groups, image.group);
          }
        }
      }

      if (image?.group) {
        image.group.open = open;
      }

      this.stateService.editingGroup = null;
      this.stateService.editingGroupImages = null;
      this.stateService.refreshFilter();
    });
  }

  public reorderGroup(target: GalleryImage): void {
    if (target && target.group) {
      this.dialogService.create(GroupOrderComponent, { images: target.group.images.slice() }).then(images => {
        if (images) {
          target.group.images.sort((a, b) => images.indexOf(a) - images.indexOf(b));
          this.stateService.refreshFilter();
          this.stateService.updateData();
        }
      });
    }
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
