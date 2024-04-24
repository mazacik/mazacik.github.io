import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { TippyService } from '@ngneat/helipopper';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { SwitchComponent } from 'src/app/shared/components/switch/switch.component';
import { SwitchEvent } from 'src/app/shared/components/switch/switch.event';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GalleryUtils } from '../../gallery.utils';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { ImageComparisonComponent } from '../image-comparison/image-comparison.component';

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

  protected openYandexReverseImageSearch(event: MouseEvent): void {
    GalleryUtils.openYandexReverseImageSearch(event, this.stateService.target(), this.tippyService);
    this.close();
  }

  protected startImageComparison(): void {
    this.dialogService.create(ImageComparisonComponent, { images: this.stateService.filter() });
    this.close();
  }

  protected copyTargetBase64(): void {
    this.googleService.getBase64(this.stateService.target().id).then(base64 => navigator.clipboard.writeText(base64));
  }

  protected openTargetInGoogleDrive(): void {
    this.googleService.openSearch(this.stateService.target().name);
  }

  protected onAutoBookmarkStateChange(event: SwitchEvent): void {
    this.needsUpdate = true;
    this.stateService.settings.autoBookmark = event.state;
  }

  @HostListener('window:keydown.enter', ['$event'])
  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    if (this.needsUpdate && this.stateService.images) this.googleService.updateData();
    this.resolve(true);
  }

}
