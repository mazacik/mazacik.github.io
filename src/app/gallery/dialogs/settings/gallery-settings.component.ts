import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
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
export class GallerySettingsComponent extends DialogContent<boolean> implements OnInit {

  public configuration: DialogConfiguration = {
    title: 'Settings',
    buttons: [{
      text: () => 'OK',
      click: () => this.close()
    }],
    hideTopRightCloseButton: true
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
        this.stateService.refreshFilter();
      }
      if (this.needsDataUpdate) {
        this.stateService.updateData();
      }
    }
    this.resolve(true);
  }

}
