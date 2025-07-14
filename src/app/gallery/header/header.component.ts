import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { GalleryService } from '../gallery.service';
import { GalleryGoogleDriveService } from '../services/gallery-google-drive.service';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    TippyDirective
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService,
    protected googleService: GalleryGoogleDriveService
  ) { }

  protected openGoogleDriveDataFolder(): void {
    this.googleService.openFolderById(this.stateService.dataFolderId);
  }

}
