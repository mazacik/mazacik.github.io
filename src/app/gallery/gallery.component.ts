import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { enter } from '../shared/consntants/animations.constants';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { FullscreenComponent } from './fullscreen/fullscreen.component';
import { GalleryUtils } from './gallery.utils';
import { MasonryComponent } from './masonry/masonry.component';
import { GalleryImage } from './model/gallery-image.class';
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
    this.stateService.processData().then(async data => {
      if (!data.settings) {
        this.stateService.settings = {} as GallerySettings;
        await this.dialogService.openSettings();
      }
      this.stateService.processImages(data);
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected initKeybinds(event: KeyboardEvent): void {
    // TODO restrict keybinds context
    if (['BODY', 'VIDEO'].includes(document.activeElement.nodeName)) {
      const target: GalleryImage = this.stateService.target();
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
          this.stateService.target.set(GalleryUtils.getNearestImageUp(target, this.stateService.masonryImages));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          if (event.shiftKey) {
            this.stateService.target.set(GalleryUtils.getNearestImageLeft(target, target.group.images.filter(groupImage => groupImage.passesFilter)));
          } else {
            this.stateService.target.set(GalleryUtils.getNearestImageLeft(target, this.stateService.masonryImages));
          }
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.stateService.target.set(GalleryUtils.getNearestImageDown(target, this.stateService.masonryImages));
          break;
        case 'KeyD':
        case 'ArrowRight':
          if (event.shiftKey) {
            this.stateService.target.set(GalleryUtils.getNearestImageRight(target, target.group.images.filter(groupImage => groupImage.passesFilter)));
          } else {
            this.stateService.target.set(GalleryUtils.getNearestImageRight(target, this.stateService.masonryImages));
          }
          break;
      }
    }
  }

}
