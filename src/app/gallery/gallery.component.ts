import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { enter } from '../shared/constants/animations.constants';
import { ApplicationService } from '../shared/services/application.service';
import { FilterComponent } from './components/filter/filter.component';
import { FullscreenComponent } from './components/fullscreen/fullscreen.component';
import { MasonryComponent } from './components/masonry/masonry.component';
import { TaggerComponent } from './components/tagger/tagger.component';
import { GalleryStateService } from './services/gallery-state.service';
import { GallerySerializationService } from './services/gallery-serialization.service';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    FilterComponent,
    MasonryComponent,
    FullscreenComponent,
    TaggerComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  animations: [enter]
})
export class GalleryComponent implements OnInit {

  protected loading: boolean = true;

  constructor(
    private serializationService: GallerySerializationService,
    private applicationService: ApplicationService,
    protected stateService: GalleryStateService
  ) {
    this.applicationService.loading.set(true);
  }

  ngOnInit(): void {
    this.serializationService.processData().then(() => this.loading = false);
  }

}
