import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { enter } from '../shared/constants/animations.constants';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { FullscreenComponent } from './fullscreen/fullscreen.component';
import { MasonryComponent } from './masonry/masonry.component';
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

}
