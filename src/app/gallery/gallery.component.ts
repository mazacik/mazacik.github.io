import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { GoogleMetadata } from '../shared/classes/google-api/google-metadata.class';
import { enter } from '../shared/consntants/animations.constants';
import { ApplicationService } from '../shared/services/application.service';
import { ArrayUtils } from '../shared/utils/array.utils';
import { GoogleFileUtils } from '../shared/utils/google-file.utils';
import { GalleryUtils } from './gallery.utils';
import { MasonryComponent } from './masonry/masonry.component';
import { Data } from './model/data.interface';
import { GalleryGroup } from './model/gallery-group.class';
import { GalleryImage } from './model/gallery-image.class';
import { ImageProperties } from './model/image-properties.interface';
import { GalleryGoogleDriveService } from './services/gallery-google-drive.service';
import { GalleryStateService } from './services/gallery-state.service';
import { FullscreenComponent } from './fullscreen/fullscreen.component';
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
    private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private stateService: GalleryStateService,
    private googleService: GalleryGoogleDriveService
  ) {
    this.applicationService.loading.next(true);
  }

  ngOnInit(): void {
    this.initKeybinds();
    this.googleService.getData().then(data => {
      this.stateService.rootFolderId = data.rootFolderId;
      this.stateService.heartsFilter = data.heartsFilter;
      this.stateService.bookmarksFilter = data.bookmarksFilter;
      this.stateService.groupSizeFilterMin = data.groupSizeFilterMin;
      this.stateService.groupSizeFilterMax = data.groupSizeFilterMax;
      this.stateService.tagGroups = data.tagGroups;
      this.processData(data);
    });
  }

  private processData(data: Data, folderId: string = this.stateService.rootFolderId, imageCollector: GalleryImage[] = [], recursionTracker = { calls: 0 }): void {
    recursionTracker.calls++;

    this.googleService.getFolderMetadata(folderId).then(metadata => {
      for (const folder of metadata.filter(entity => GoogleFileUtils.isFolder(entity))) {
        this.processData(data, folder.id, imageCollector, recursionTracker);
      }

      ArrayUtils.push(imageCollector, this.metaToImages(metadata, data.imageProperties));

      if (--recursionTracker.calls == 0) {
        this.stateService.images = imageCollector;
        this.stateService.groups = data.groupProperties.map(groupProperties => {
          const group: GalleryGroup = new GalleryGroup();
          group.images = this.stateService.images.filter(image => groupProperties.imageIds.includes(image.id));
          group.images.forEach(image => image.group = group);
          group.star = groupProperties.starId ? group.star = group.images.find(image => image.id == groupProperties.starId) : group.images[0];
          return group;
        });

        this.stateService.refreshFilter();
        this.stateService.target.set(ArrayUtils.getFirst(this.stateService.filter()));

        for (const image of ArrayUtils.difference(data.imageProperties, this.stateService.images, (i1, i2) => i1.id == i2.id)) {
          console.log(image);
          console.log('This image does not exist, but has a data entry. Removing image entry from data.');
          ArrayUtils.remove(this.stateService.images, this.stateService.images.find(_image => _image.id == image.id));
        }

        this.stateService.tagCounts['_heart'] = this.stateService.images.filter(image => image.heart).length;
        this.stateService.tagCounts['_bookmark'] = this.stateService.images.filter(image => image.bookmark).length;

        for (const filterGroup of this.stateService.tagGroups) {
          for (const tag of filterGroup.tags) {
            this.stateService.tagCounts[tag.id] = 0;
          }
        }

        for (const image of this.stateService.images) {
          for (const tagId of image.tags) {
            this.stateService.tagCounts[tagId]++;
          }
        }

        this.applicationService.loading.next(false);
      };
    });
  }

  private metaToImages(metadata: GoogleMetadata[], imageProperties: ImageProperties[]): GalleryImage[] {
    return metadata.filter(entity => GoogleFileUtils.isImage(entity) || GoogleFileUtils.isVideo(entity)).map(image => {
      return this.metaToImage(image as GoogleMetadata, imageProperties.find(_image => _image.id == image.id), this.applicationService.reduceBandwidth)
    });
  }

  private metaToImage(metadata: GoogleMetadata, imageProperties: ImageProperties, bReduceBandwidth: boolean): GalleryImage {
    const image: GalleryImage = new GalleryImage();
    image.id = metadata.id;
    image.name = metadata.name;
    image.mimeType = metadata.mimeType;

    if (metadata.thumbnailLink) {
      if (bReduceBandwidth) {
        image.thumbnailLink = metadata.thumbnailLink;
      } else {
        image.thumbnailLink = metadata.thumbnailLink.replace('=s220', '=s440');
      }

      if (GoogleFileUtils.isImage(image)) {
        image.imageMediaMetadata = metadata.imageMediaMetadata;
        image.aspectRatio = image.imageMediaMetadata.width / image.imageMediaMetadata.height;
        image.contentLink = metadata.thumbnailLink.replace('=s220', '=s' + Math.max(window.screen.width, window.screen.height));
      } else if (GoogleFileUtils.isVideo(image)) {
        image.videoMediaMetadata = metadata.videoMediaMetadata;
        if (!image.videoMediaMetadata) image.videoMediaMetadata = {};
        if (!image.videoMediaMetadata.width || image.videoMediaMetadata.width == 0) image.videoMediaMetadata.width = 1920;
        if (!image.videoMediaMetadata.height || image.videoMediaMetadata.height == 0) image.videoMediaMetadata.height = 1080;

        image.aspectRatio = image.videoMediaMetadata.width / image.videoMediaMetadata.height;
        image.contentLink = this.sanitizer.bypassSecurityTrustResourceUrl('https://drive.google.com/file/d/' + image.id + '/preview') as string; // used in <iframe> display method
      }
    }

    if (imageProperties) {
      image.heart = imageProperties.heart;
      image.bookmark = imageProperties.bookmark;
      image.tags = imageProperties.tags;
    } else {
      image.tags = [];
    }

    return image;
  }

  // TODO find a better way to handle keybinds
  private initKeybinds(): void {
    document.addEventListener('keyup', event => {
      if (['BODY', 'VIDEO'].includes(document.activeElement.nodeName)) {
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
            this.stateService.target.set(GalleryUtils.getNearestImageUp(this.stateService.target(), this.stateService.filter()));
            break;
          case 'KeyD':
          case 'ArrowRight':
            this.stateService.target.set(GalleryUtils.getNearestImageRight(this.stateService.target(), this.stateService.filter()));
            break;
          case 'KeyS':
          case 'ArrowDown':
            this.stateService.target.set(GalleryUtils.getNearestImageDown(this.stateService.target(), this.stateService.filter()));
            break;
          case 'KeyA':
          case 'ArrowLeft':
            this.stateService.target.set(GalleryUtils.getNearestImageLeft(this.stateService.target(), this.stateService.filter()));
            break;
        }
      }
    });
  }

}
