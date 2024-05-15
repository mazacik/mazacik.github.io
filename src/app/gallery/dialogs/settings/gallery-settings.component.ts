import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { TippyService } from '@ngneat/helipopper';
import { DialogButton } from 'src/app/shared/components/dialog/dialog-button.class';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { SwitchComponent } from 'src/app/shared/components/switch/switch.component';
import { SwitchEvent } from 'src/app/shared/components/switch/switch.event';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GalleryUtils } from '../../gallery.utils';
import { GalleryGroup } from '../../model/gallery-group.class';
import { GalleryImage } from '../../model/gallery-image.class';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GroupOrderComponent } from '../group-order/group-order.component';
import { ImageComparisonComponent } from '../image-comparison/image-comparison.component';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';

@Component({
  selector: 'app-gallery-settings',
  standalone: true,
  imports: [
    CommonModule,
    SwitchComponent
  ],
  templateUrl: './gallery-settings.component.html',
  styleUrls: ['./gallery-settings.component.scss']
})
export class GallerySettingsComponent extends DialogContent<boolean> implements OnInit {

  public configuration: DialogConfiguration = {
    title: 'Settings',
    buttons: [{
      text: () => 'Close',
      click: () => this.close()
    }]
  };

  private needsUpdate: boolean = false;

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    private googleService: GalleryGoogleDriveService,
    private dialogService: DialogService,
    private tippyService: TippyService
  ) {
    super();
  }

  ngOnInit(): void {

  }

  protected modifyGroup(): void {
    let open: boolean;
    const target: GalleryImage = this.stateService.target();
    if (target.group) {
      open = target.group.open;
      target.group.open = true;
      this.stateService.modifyingGroup = target.group.images.slice();
    } else {
      this.stateService.modifyingGroup = [target];
    }

    const buttons: DialogButton[] = [{ text: () => 'Confirm: ' + this.stateService.modifyingGroup?.length + ' images', click: () => null }, { iconClass: () => 'fa-solid fa-times' }];
    this.dialogService.create(null, { buttons: buttons }, false, 'bottom').then((success: boolean) => {
      if (success) {
        if (this.stateService.modifyingGroup.length > 1) {
          if (target.group) {
            target.group.images = this.stateService.modifyingGroup;
            target.group.images.forEach(image => image.group = target.group);
          } else {
            const group: GalleryGroup = new GalleryGroup();
            group.images = this.stateService.modifyingGroup;
            group.images.forEach(image => image.group = group);
            this.stateService.groups.push(group);
          }

          this.stateService.updateData();
        } else {
          if (target.group) {
            target.group.images.forEach(image => image.group = null);
            ArrayUtils.remove(this.stateService.groups, target.group);
          }
        }
      }

      if (target.group) {
        target.group.open = open;
      }

      this.stateService.modifyingGroup = null;

      if (target.group) {
        target.group.images.forEach(image => this.stateService.refreshFilter(image));
      }
    });

    if (target.group) {
      target.group.images.forEach(image => this.stateService.refreshFilter(image));
    }

    this.close();
  }

  protected reorderGroup(): void {
    this.dialogService.create(GroupOrderComponent, { images: this.stateService.target().group.images.slice() }).then(images => {
      if (images) {
        const map = new Map<string, number>();
        images.forEach((image, index) => map.set(image.id, index));
        this.stateService.target().group.images.sort((a, b) => map.get(a.id) - map.get(b.id));
        this.stateService.refreshFilter();
        this.stateService.updateData();
      }
    });
    this.close();
  }

  protected openYandexReverseImageSearch(event: MouseEvent): void {
    GalleryUtils.openYandexReverseImageSearch(event, this.stateService.target(), this.tippyService);
    this.close();
  }

  protected startImageComparison(): void {
    this.dialogService.create(ImageComparisonComponent, { images: this.stateService.images.filter(i => i.passesFilter) });
    this.close();
  }

  protected copyTargetBase64(): void {
    this.googleService.getBase64(this.stateService.target().id).then(base64 => navigator.clipboard.writeText(base64));
    this.close();
  }

  protected openTargetInGoogleDrive(): void {
    this.googleService.openSearch(this.stateService.target().name);
    this.close();
  }

  protected onAutoBookmarkStateChange(event: SwitchEvent): void {
    this.needsUpdate = true;
    this.stateService.settings.autoBookmark = event.state;
  }

  @HostListener('window:keydown.enter', ['$event'])
  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    if (this.needsUpdate && this.stateService.images) this.stateService.updateData();
    this.resolve(true);
  }

}
