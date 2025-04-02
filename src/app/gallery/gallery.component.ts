import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { enter } from '../shared/constants/animations.constants';
import { ApplicationService } from '../shared/services/application.service';
import { FullscreenComponent } from './fullscreen/fullscreen.component';
import { MasonryComponent } from './masonry/masonry.component';
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
    private applicationService: ApplicationService,
    protected stateService: GalleryStateService
  ) {
    this.applicationService.loading.set(true);
  }

  ngOnInit(): void {
    this.stateService.processData();
  }

}
