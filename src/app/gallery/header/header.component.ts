import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ImageComparisonComponent } from '../dialogs/image-comparison/image-comparison.component';
import { GalleryService } from '../gallery.service';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    CreateDirective,
    TippyDirective
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    protected dialogService: DialogService,
    protected galleryService: GalleryService
  ) { }

  protected openImageComparison(): void {
    this.dialogService.create(ImageComparisonComponent, { images: ArrayUtils.shuffle(this.stateService.images.slice()) });
  }

}
