import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GalleryService } from '../gallery.service';

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
    protected applicationService: ApplicationService,
    protected galleryService: GalleryService
  ) { }

}
