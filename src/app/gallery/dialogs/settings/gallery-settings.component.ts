import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CheckboxComponent } from 'src/app/shared/components/checkbox/checkbox.component';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GallerySettings } from '../../model/gallery-settings.interface';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-gallery-settings',
  standalone: true,
  imports: [
    CommonModule,
    CheckboxComponent
  ],
  templateUrl: './gallery-settings.component.html',
  styleUrls: ['./gallery-settings.component.scss']
})
export class GallerySettingsComponent extends DialogContentBase<boolean> implements OnInit {

  public configuration: DialogContainerConfiguration = {
    title: 'Settings',
    buttons: [{
      text: () => 'Save',
      click: () => this.submit()
    }],
    hideHeaderCloseButton: true
  };

  private needsFilterRefresh: boolean = false;
  private needsDataUpdate: boolean = false;

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    if (!this.stateService.settings) {
      this.stateService.settings = {} as GallerySettings;
    }
  }

  protected bookmarkAll(): void {
    this.stateService.images.forEach(image => image.bookmark = true);
    this.stateService.updateFilters();
    this.stateService.save();
  }

  protected onShowTagCountValueChange(value: boolean): void {
    this.needsDataUpdate = true;
    this.stateService.settings.showTagCount = value;
  }

  protected onShowVideosValueChange(value: boolean): void {
    this.needsDataUpdate = true;
    this.needsFilterRefresh = true;
    this.stateService.settings.showVideos = value;
  }

  protected onAutoBookmarkValueChange(value: boolean): void {
    this.needsDataUpdate = true;
    this.stateService.settings.autoBookmark = value;
  }

  public close(): void {
    if (this.stateService.images) {
      if (this.needsFilterRefresh) {
        this.stateService.updateFilters();
      }
      if (this.needsDataUpdate) {
        this.stateService.save();
      }
    }
    this.resolve(true);
  }

}
