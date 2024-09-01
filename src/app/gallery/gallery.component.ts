import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { enter } from '../shared/constants/animations.constants';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { ArrayUtils } from '../shared/utils/array.utils';
import { FullscreenComponent } from './fullscreen/fullscreen.component';
import { MasonryUtils } from './masonry.utils';
import { MasonryComponent } from './masonry/masonry.component';
import { GalleryImage } from './model/gallery-image.class';
import { GallerySettings } from './model/gallery-settings.interface';
import { GalleryStateService } from './services/gallery-state.service';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    MasonryComponent,
    FullscreenComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  animations: [enter]
})
export class GalleryComponent implements OnInit {

  constructor(
    private dialogService: DialogService,
    private applicationService: ApplicationService,
    protected stateService: GalleryStateService
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
          this.stateService.target.set(MasonryUtils.getNearestImageUp(this.stateService.masonryImages, this.stateService.masonryTargetReference));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          if (event.shiftKey) {
            this.stateService.target.set(ArrayUtils.getPrevious(target.group.images, target, true));
          } else {
            this.stateService.target.set(MasonryUtils.getNearestImageLeft(this.stateService.masonryImages, this.stateService.masonryTargetReference));
          }
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.stateService.target.set(MasonryUtils.getNearestImageDown(this.stateService.masonryImages, this.stateService.masonryTargetReference));
          break;
        case 'KeyD':
        case 'ArrowRight':
          if (event.shiftKey) {
            this.stateService.target.set(ArrayUtils.getNext(target.group.images, target, true));
          } else {
            this.stateService.target.set(MasonryUtils.getNearestImageRight(this.stateService.masonryImages, this.stateService.masonryTargetReference));
          }
          break;
      }
    }
  }

}
