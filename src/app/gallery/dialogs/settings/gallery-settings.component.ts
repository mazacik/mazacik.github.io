import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CheckboxComponent } from 'src/app/shared/components/checkbox/checkbox.component';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GallerySettings } from '../../models/gallery-settings.interface';
import { FilterService } from '../../services/filter.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';

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
    private serializationService: GallerySerializationService,
    private dialogService: DialogService,
    private filterService: FilterService,
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

  protected bookmarkImages(): void {
    this.dialogService.createConfirmation({ title: 'Confirmation: Bookmark All Images', messages: ['Are you sure you want to bookmark all images?'] }).then(success => {
      if (success) {
        this.stateService.images.forEach(image => image.bookmark = true);
        this.filterService.updateFilters();
        this.serializationService.save();
      }
    });
  }

  protected resetDialogPositions(): void {
    this.dialogService.containerComponentInstances.forEach(instance => {
      instance.top = null;
      instance.left = null;
    });

    for (let i = 0; i < localStorage.length; i++) {
      const key: string = localStorage.key(i);
      if (key.endsWith('.top') || key.endsWith('.left')) {
        localStorage.removeItem(key);
      }
    }
  }

  public close(): void {
    if (this.stateService.images) {
      if (this.needsFilterRefresh) {
        this.filterService.updateFilters();
      }
      if (this.needsDataUpdate) {
        this.serializationService.save();
      }
    }
    this.resolve(true);
  }

}
