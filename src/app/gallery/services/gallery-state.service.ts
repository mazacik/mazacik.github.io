import { Injectable, WritableSignal, signal } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { GalleryGroup } from "src/app/gallery/model/gallery-group.class";
import { GalleryImage } from "src/app/gallery/model/gallery-image.class";
import { GoogleMetadata } from "src/app/shared/classes/google-api/google-metadata.class";
import { ApplicationService } from "src/app/shared/services/application.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { GoogleFileUtils } from "src/app/shared/utils/google-file.utils";
import { ScreenUtils } from "src/app/shared/utils/screen.utils";
import { GalleryUtils } from "../gallery.utils";
import { Data } from "../model/data.interface";
import { GallerySettings } from "../model/gallery-settings.interface";
import { ImageProperties } from "../model/image-properties.interface";
import { TagGroup } from "../model/tag-group.interface";
import { GalleryGoogleDriveService } from "./gallery-google-drive.service";

@Injectable({
  providedIn: 'root',
})
export class GalleryStateService {

  public rootFolderId: string;
  public settings: GallerySettings;

  public targetEntireGroup: boolean = false;
  public fullscreenVisible: WritableSignal<boolean> = signal(false);
  public sidebarVisible: boolean = ScreenUtils.isLargeScreen() || this.applicationService.reduceBandwidth;

  public images: GalleryImage[];
  public groups: GalleryGroup[];
  public filter: WritableSignal<GalleryImage[]> = signal([]);
  public target: WritableSignal<GalleryImage> = signal(null);

  public tagGroups: TagGroup[];
  public tagCounts: { [tagId: string]: number } = {};

  public heartsFilter: number;
  public bookmarksFilter: number;
  public groupSizeFilterMin: number;
  public groupSizeFilterMax: number;

  constructor(
    private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private googleService: GalleryGoogleDriveService
  ) { }

  public async processData(): Promise<Data> {
    const data = await this.googleService.getData();
    this.rootFolderId = data.rootFolderId;
    this.heartsFilter = data.heartsFilter;
    this.bookmarksFilter = data.bookmarksFilter;
    this.settings = data.settings;
    this.groupSizeFilterMin = data.groupSizeFilterMin;
    this.groupSizeFilterMax = data.groupSizeFilterMax;
    this.tagGroups = data.tagGroups;
    return data;
  }

  public processImages(data: Data, folderId: string = this.rootFolderId, imageCollector: GalleryImage[] = [], recursionTracker = { calls: 0 }): void {
    recursionTracker.calls++;

    this.googleService.getFolderMetadata(folderId).then(metadata => {
      for (const folder of metadata.filter(entity => GoogleFileUtils.isFolder(entity))) {
        this.processImages(data, folder.id, imageCollector, recursionTracker);
      }

      ArrayUtils.push(imageCollector, this.metaToImages(metadata, data.imageProperties));

      if (--recursionTracker.calls == 0) {
        this.images = imageCollector;
        this.groups = data.groupProperties.map(groupProperties => {
          const group: GalleryGroup = new GalleryGroup();
          group.images = this.images.filter(image => groupProperties.imageIds.includes(image.id));
          group.images.forEach(image => image.group = group);
          group.star = groupProperties.starId ? group.star = group.images.find(image => image.id == groupProperties.starId) : group.images[0];
          return group;
        });

        this.refreshFilter();
        this.target.set(ArrayUtils.getFirst(this.filter()));

        for (const image of ArrayUtils.difference(data.imageProperties, this.images, (i1, i2) => i1.id == i2.id)) {
          console.log(image);
          console.log('This image does not exist, but has a data entry. Removing image entry from data.');
          ArrayUtils.remove(this.images, this.images.find(_image => _image.id == image.id));
        }

        this.tagCounts['_heart'] = this.images.filter(image => image.heart).length;
        this.tagCounts['_bookmark'] = this.images.filter(image => image.bookmark).length;

        for (const filterGroup of this.tagGroups) {
          for (const tag of filterGroup.tags) {
            this.tagCounts[tag.id] = 0;
          }
        }

        for (const image of this.images) {
          for (const tagId of image.tags) {
            this.tagCounts[tagId]++;
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
      image.tags = imageProperties.tags || [];
      image.likes = imageProperties.likes || 0;
    } else {
      if (this.settings.autoBookmark) image.bookmark = true;
      image.tags = [];
      image.likes = 0;
    }

    return image;
  }

  public setRandomTarget(): void {
    if (!ArrayUtils.isEmpty(this.filter())) {
      let nextTarget: GalleryImage;
      const currentTarget: GalleryImage = this.target();

      if (currentTarget) {
        if (currentTarget.hasGroup()) {
          nextTarget = ArrayUtils.getRandom(this.filter(), currentTarget.getGroupImages());
        } else {
          nextTarget = ArrayUtils.getRandom(this.filter(), [currentTarget]);
        }
      } else {
        nextTarget = ArrayUtils.getRandom(this.filter());
      }

      if (nextTarget) {
        if (nextTarget.hasGroup()) {
          nextTarget = ArrayUtils.getRandom(nextTarget.getGroupImages().filter(image => this.doesPassFilter(image)));
        }

        this.target.set(nextTarget);
      }
    }
  }

  public setRandomGroupTarget(): void {
    const target: GalleryImage = this.target();
    if (target?.hasGroup()) {
      this.target.set(ArrayUtils.getRandom(target.getGroupImages().filter(image => this.doesPassFilter(image)), [target]));
    }
  }

  public refreshFilter(forImage?: GalleryImage): void {
    this.filter.set(this.images.filter(image => {
      if (forImage == undefined || forImage == image) {
        if (image.hasGroup()) {
          if (image.group.open) {
            image.passesFilter = this.doesPassFilter(image);
          } else {
            image.passesFilter = this.getGroupRepresent(image) == image;
          }
        } else {
          image.passesFilter = this.doesPassFilter(image);
        }
      }
      return image.passesFilter;
    }));
  }

  public getGroupRepresent(image: GalleryImage): GalleryImage {
    if (image.hasGroup()) {
      if (this.doesPassFilter(image.group.star)) return image.group.star;
      // TODO prioritize hearts and bookmarks
      return image.group.images.find(image => this.doesPassFilter(image));
    } else {
      return image;
    }
  }

  public doesPassFilter(image: GalleryImage): boolean {
    if (!image) return false;

    if (this.heartsFilter == -1 && image.heart) {
      return false;
    }

    if (this.heartsFilter == 1 && !image.heart) {
      return false;
    }

    if (this.bookmarksFilter == -1 && image.bookmark) {
      return false;
    }

    if (this.bookmarksFilter == 1 && !image.bookmark) {
      return false;
    }

    const groupSize: number = image.hasGroup() ? image.getGroupImages().length : 0;
    if (groupSize < this.groupSizeFilterMin) {
      return false;
    }

    if (groupSize > this.groupSizeFilterMax) {
      return false;
    }

    let hasGroup: boolean;
    for (const tagGroup of this.tagGroups) {
      hasGroup = tagGroup.tags.some(tag => image.tags.includes(tag.id));
      if (tagGroup.state == -1 && hasGroup) {
        return false;
      }

      if (tagGroup.state == 1 && !hasGroup) {
        return false;
      }
    }

    let includes: boolean;
    for (const tag of this.tagGroups.flatMap(group => group.tags)) {
      includes = image.tags.includes(tag.id);
      if (tag.state == -1 && includes) {
        return false;
      }

      if (tag.state == 1 && !includes) {
        return false;
      }
    }

    return true;
  }

  public toggleHeart(image: GalleryImage): void {
    const newValue: boolean = !image.heart;
    if (image.hasGroup() && this.targetEntireGroup) {
      image.getGroupImages().forEach(groupImage => groupImage.heart = newValue);
    } else {
      image.heart = newValue;
    }

    this.tagCounts['_heart'] = this.images.filter(i => i.heart).length;
    this.refreshFilter(image);
    this.googleService.updateData();
  }

  public toggleBookmark(image: GalleryImage): void {
    const newValue: boolean = !image.bookmark;
    if (image.hasGroup() && this.targetEntireGroup) {
      image.getGroupImages().forEach(groupImage => groupImage.bookmark = newValue);
    } else {
      image.bookmark = newValue;
    }

    this.tagCounts['_bookmark'] = this.images.filter(i => i.bookmark).length;
    this.refreshFilter(image);
    this.googleService.updateData();
  }

  public toggleTag(image: GalleryImage, tag: string): void {
    const tags: string[] = image.tags;
    let groupTags: string[];
    if (image.hasGroup() && this.targetEntireGroup) {
      if (tags.includes(tag)) {
        for (const groupImage of image.getGroupImages()) {
          groupTags = groupImage.tags;
          if (groupTags.includes(tag)) {
            ArrayUtils.remove(groupTags, tag);
          }
        }
      } else {
        for (const groupImage of image.getGroupImages()) {
          groupTags = groupImage.tags;
          if (!groupTags.includes(tag)) {
            groupTags.push(tag);
          }
        }
      }
    } else {
      tags.includes(tag) ? ArrayUtils.remove(tags, tag) : tags.push(tag);
    }

    this.tagCounts[tag] = this.images.filter(i => i.tags.includes(tag)).length;
    this.refreshFilter(image);
    this.googleService.updateData();
  }

  public like(image: GalleryImage): void {
    image.likes++;
    this.googleService.updateData();
  }

  public dislike(image: GalleryImage): void {
    if (image.likes > 0) {
      image.likes--;
      this.googleService.updateData();
    }
  }

  public async moveTargetToTrash(): Promise<void> {
    this.applicationService.loading.next(true);

    const target: GalleryImage = this.target();
    if (target) {
      const nextTarget: GalleryImage = await this.moveImageToTrash(target);
      this.refreshFilter(); // why is refreshFilter needed here
      this.target.set(nextTarget);

      for (const key in this.tagCounts) {
        this.tagCounts[key] = 0;
      }

      this.tagCounts['_heart'] = this.images.filter(i => i.heart).length;
      this.tagCounts['_bookmark'] = this.images.filter(i => i.bookmark).length;

      for (const image of this.images) {
        for (const tagId of image.tags) {
          this.tagCounts[tagId]++;
        }
      }

      this.googleService.updateData();
    }

    this.applicationService.loading.next(false);
  }

  // TODO this method shouldn't worry about nextTarget
  private async moveImageToTrash(image: GalleryImage): Promise<GalleryImage> {
    let index: number;
    let nextTarget: GalleryImage;
    const filter: GalleryImage[] = this.filter();
    if (image.hasGroup()) {
      index = image.getGroupImages().indexOf(image);
      if (ArrayUtils.isLast(image.getGroupImages(), image)) {
        nextTarget = image.getGroupImages()[index - 1];
      } else {
        nextTarget = image.getGroupImages()[index + 1];
      }
    } else {
      if (ArrayUtils.isLast(filter, image)) {
        nextTarget = GalleryUtils.getNearestImageLeft(image, filter);
      } else {
        nextTarget = GalleryUtils.getNearestImageRight(image, filter);
      }
    }

    this.googleService.trash(image.id);
    ArrayUtils.remove(this.images, this.images.find(i => i.id == image.id));

    if (image.hasGroup()) {
      ArrayUtils.remove(image.getGroupImages(), image.getGroupImages().find(i => i.id == image.id));
      if (image.group.star == image && image.group.images.length > 0) {
        image.group.star = image.group.images[0];
      }
    }

    return nextTarget;
  }

}
