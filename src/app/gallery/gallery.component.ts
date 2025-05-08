import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { enter } from '../shared/constants/animations.constants';
import { ApplicationService } from '../shared/services/application.service';
import { FilterComponent } from './dialogs/filter/filter.component';
import { TagManagerComponent } from "./dialogs/tag-manager/tag-manager.component";
import { FullscreenComponent } from './fullscreen/fullscreen.component';
import { MasonryComponent } from './masonry/masonry.component';
import { GalleryStateService } from './services/gallery-state.service';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    FilterComponent,
    MasonryComponent,
    FullscreenComponent,
    TagManagerComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  animations: [enter]
})
export class GalleryComponent implements OnInit {

  protected loading: boolean = true;

  constructor(
    private applicationService: ApplicationService,
    protected stateService: GalleryStateService
  ) {
    this.applicationService.loading.set(true);
  }

  ngOnInit(): void {
    this.stateService.processData().then(() => this.loading = false);
  }

}
