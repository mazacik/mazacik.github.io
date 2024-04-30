import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { enter } from '../shared/consntants/animations.constants';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { FullscreenComponent } from './fullscreen/fullscreen.component';
import { GalleryUtils } from './gallery.utils';
import { MasonryComponent } from './masonry/masonry.component';
import { GallerySettings } from './model/gallery-settings.interface';
import { GalleryStateService } from './services/gallery-state.service';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    MasonryComponent,
    FullscreenComponent,
    SidebarComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  animations: [enter]
})
export class GalleryComponent implements OnInit {

  constructor(
    private dialogService: DialogService,
    private applicationService: ApplicationService,
    private stateService: GalleryStateService
  ) {
    this.applicationService.loading.next(true);
  }

  ngOnInit(): void {
    this.initKeybinds();
    this.stateService.processData().then(async data => {
      if (!data.settings) {
        this.stateService.settings = {} as GallerySettings;
        await this.dialogService.openSettings();
      }
      this.stateService.processImages(data);
    });
  }

  // TODO find a better way to handle keybinds
  private initKeybinds(): void {
    document.addEventListener('keyup', event => {
      if (['BODY', 'VIDEO'].includes(document.activeElement.nodeName)) {
        switch (event.code) {
          case 'KeyF':
            this.stateService.fullscreenVisible.update(value => !value);
            break;
          case 'KeyR':
            this.stateService.setRandomTarget();
            break;
          case 'KeyG':
            this.stateService.setRandomGroupTarget();
            break;
          case 'KeyW':
          case 'ArrowUp':
            this.stateService.target.set(GalleryUtils.getNearestImageUp(this.stateService.target(), this.stateService.filter()));
            break;
          case 'KeyD':
          case 'ArrowRight':
            this.stateService.target.set(GalleryUtils.getNearestImageRight(this.stateService.target(), this.stateService.filter()));
            break;
          case 'KeyS':
          case 'ArrowDown':
            this.stateService.target.set(GalleryUtils.getNearestImageDown(this.stateService.target(), this.stateService.filter()));
            break;
          case 'KeyA':
          case 'ArrowLeft':
            this.stateService.target.set(GalleryUtils.getNearestImageLeft(this.stateService.target(), this.stateService.filter()));
            break;
        }
      }
    });
  }

}
