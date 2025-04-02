import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { SwitchComponent } from 'src/app/shared/components/switch/switch.component';
import { SwitchEvent } from 'src/app/shared/components/switch/switch.event';
import { GallerySettings } from '../../model/gallery-settings.interface';
import { GalleryStateService } from '../../services/gallery-state.service';

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
export class GallerySettingsComponent extends DialogContentBase<boolean> implements OnInit {

  public configuration: DialogContainerConfiguration = {
    title: 'Settings',
    buttons: [{
      text: () => 'OK',
      click: () => this.close()
    }],
    hideHeaderCloseButton: true
  };

  private needsFilterRefresh: boolean = false;
  private needsDataUpdate: boolean = false;

  constructor(
    protected stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    if (!this.stateService.settings) {
      this.stateService.settings = {} as GallerySettings;
    }
  }

  protected onShowVideosStateChange(event: SwitchEvent): void {
    this.needsFilterRefresh = true;
    this.needsDataUpdate = true;
    this.stateService.settings.showVideos = event.state;
  }

  protected onAutoBookmarkStateChange(event: SwitchEvent): void {
    this.needsDataUpdate = true;
    this.stateService.settings.autoBookmark = event.state;
  }

  @HostListener('window:keydown.enter', ['$event'])
  @HostListener('window:keydown.escape', ['$event'])
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
