import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GalleryService } from '../../services/gallery.service';

interface ImageAction {
  label: string;
  run: (event: MouseEvent) => void | Promise<void>;
}

@Component({
  selector: 'app-image-options',
  templateUrl: './image-options.component.html',
  styleUrls: ['./image-options.component.scss']
})
export class ImageOptionsComponent extends DialogContentBase<void> {
  public override inputs: { image: GalleryImage };

  public configuration: DialogContainerConfiguration = {
    title: () => 'Image: ' + this.inputs.image.name,
    headerButtons: [{ iconClass: 'fa-solid fa-times', click: () => this.close() }],
    footerButtons: [{ text: () => 'Cancel', click: () => this.close() }]
  };

  protected readonly actions: ImageAction[] = [
    { label: 'Download', run: () => this.googleService.download(this.inputs.image) },
    { label: 'Google Drive', run: () => this.googleService.openSearch(this.inputs.image.name) },
    { label: 'Google Lens', run: event => this.galleryService.openGoogleRIS(event, this.inputs.image) },
    { label: 'Yandex RIS', run: event => this.galleryService.openYandexRIS(event, this.inputs.image) },
    { label: 'Archive', run: () => this.galleryService.delete(this.inputs.image, true) },
    { label: 'Delete', run: () => this.galleryService.delete(this.inputs.image, false) }
  ];

  constructor(
    private googleService: GalleryGoogleDriveService,
    private galleryService: GalleryService
  ) {
    super();
  }

  protected runAction(action: ImageAction, event: MouseEvent): void {
    action.run(event);
    this.close();
  }

  public close(): void {
    this.resolve();
  }
}
