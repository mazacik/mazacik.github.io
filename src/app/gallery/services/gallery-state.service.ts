import { Injectable, WritableSignal, signal } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { GalleryGroup } from "src/app/gallery/model/gallery-group.class";
import { GalleryImage } from "src/app/gallery/model/gallery-image.class";
import { Delay } from "src/app/shared/classes/delay.class";
import { GoogleMetadata } from "src/app/shared/classes/google-api/google-metadata.class";
import { ApplicationService } from "src/app/shared/services/application.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { GoogleFileUtils } from "src/app/shared/utils/google-file.utils";
import { ScreenUtils } from "src/app/shared/utils/screen.utils";
import { Data } from "../model/data.interface";
import { GallerySettings } from "../model/gallery-settings.interface";
import { ImageProperties } from "../model/image-properties.interface";
import { TagGroup } from "../model/tag-group.interface";
import { GalleryGoogleDriveService } from "./gallery-google-drive.service";

@Injectable({
  providedIn: 'root',
})
export class GalleryStateService {

  private updateDelay: Delay = new Delay(5000);

  public dataFolderId: string;
  public archiveFolderId: string;
  public settings: GallerySettings;

  public targetEntireGroup: boolean = false;
  public fullscreenVisible: WritableSignal<boolean> = signal(false);
  public sidebarVisible: boolean = ScreenUtils.isLargeScreen() || this.applicationService.reduceBandwidth;

  public images: GalleryImage[];
  public groups: GalleryGroup[];
  public filter: WritableSignal<GalleryImage[]> = signal([]);
  public target: WritableSignal<GalleryImage> = signal(null);

  public masonryImages: GalleryImage[];
  public masonryTargetReference: GalleryImage;

  public tagGroups: TagGroup[];
  public tagCounts: { [tagId: string]: number } = {};

  public heartsFilter: number;
  public bookmarksFilter: number;
  public groupSizeFilterMin: number;
  public groupSizeFilterMax: number;

  public modifyingGroup: GalleryImage[];

  constructor(
    private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private googleService: GalleryGoogleDriveService
  ) { }

  public async processData(): Promise<Data> {
    const data = await this.googleService.getData();
    this.dataFolderId = data.dataFolderId;
    this.archiveFolderId = data.archiveFolderId;
    this.heartsFilter = data.heartsFilter;
    this.bookmarksFilter = data.bookmarksFilter;
    this.settings = data.settings;
    this.groupSizeFilterMin = data.groupSizeFilterMin;
    this.groupSizeFilterMax = data.groupSizeFilterMax;
    this.tagGroups = data.tagGroups;
    return data;
  }

  public processImages(data: Data, folderId: string = this.dataFolderId, imageCollector: GalleryImage[] = [], recursionTracker = { calls: 0 }): void {
    recursionTracker.calls++;

    this.googleService.getFolderMetadata(folderId).then(metas => {
      for (const folder of metas.filter(entity => GoogleFileUtils.isFolder(entity))) {
        this.processImages(data, folder.id, imageCollector, recursionTracker);
      }

      ArrayUtils.push(imageCollector, metas.filter(meta => GoogleFileUtils.isImage(meta) || GoogleFileUtils.isVideo(meta)).map(meta => {
        return this.metaToImage(meta, data.imageProperties.find(imageProperty => imageProperty.id == meta.id), folderId, this.applicationService.reduceBandwidth);
      }));

      if (--recursionTracker.calls == 0) {
        this.images = imageCollector;

        this.groups = data.groupProperties.map(groupProperties => {
          const group: GalleryGroup = new GalleryGroup();
          group.images = this.images.filter(image => groupProperties.imageIds.includes(image.id));
          group.images.sort((a, b) => groupProperties.imageIds.indexOf(a.id) - groupProperties.imageIds.indexOf(b.id));
          group.images.forEach(image => image.group = group);
          return group;
        });

        this.refreshFilter();
        this.target.set(ArrayUtils.getFirst(this.filter()));

        for (const image of ArrayUtils.difference(data.imageProperties, this.images, (i1, i2) => i1.id == i2.id)) {
          console.log(image);
          console.log('This image does not exist, but has a data entry. Removing image entry from data.');
          ArrayUtils.remove(this.images, this.images.find(_image => _image.id == image.id));
        }

        this.refreshTagCounts();

        this.applicationService.loading.next(false);
      };
    });
  }

  private metaToImage(metadata: GoogleMetadata, imageProperties: ImageProperties, folderId: string, bReduceBandwidth: boolean): GalleryImage {
    const image: GalleryImage = new GalleryImage();
    image.id = metadata.id;
    image.name = metadata.name;
    image.mimeType = metadata.mimeType;
    image.parentFolderId = folderId;

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

  public updateData(): void {
    this.applicationService.changes.next(true);
    this.updateDelay.restart(() => {
      this.googleService.updateContent(this.googleService.dataFileId, {
        dataFolderId: this.dataFolderId,
        archiveFolderId: this.archiveFolderId,
        settings: this.settings,
        imageProperties: this.images.map(image => {
          return {
            id: image.id,
            heart: image.heart,
            bookmark: image.bookmark,
            tags: image.tags,
            likes: image.likes
          }
        }),
        groupProperties: this.groups.map(group => {
          return {
            imageIds: group.images.map(image => image.id)
          }
        }),
        tagGroups: this.tagGroups,
        heartsFilter: this.heartsFilter,
        bookmarksFilter: this.bookmarksFilter,
        groupSizeFilterMin: this.groupSizeFilterMin,
        groupSizeFilterMax: this.groupSizeFilterMax
      } as Data).then(metadata => {
        if (!metadata) {
          this.applicationService.errors.next(true);
        }
      }).finally(() => {
        this.applicationService.changes.next(false);
      });
    });
  }

  public refreshTagCounts(): void {
    if (Object.keys(this.tagCounts).length == 0) {
      for (const filterGroup of this.tagGroups) {
        for (const tag of filterGroup.tags) {
          this.tagCounts[tag.id] = 0;
        }
      }
    } else {
      for (const key in this.tagCounts) {
        this.tagCounts[key] = 0;
      }
    }

    this.tagCounts['_heart'] = this.images.filter(image => image.heart).length;
    this.tagCounts['_bookmark'] = this.images.filter(image => image.bookmark).length;

    for (const image of this.images) {
      for (const tagId of image.tags) {
        this.tagCounts[tagId]++;
      }
    }

  }

  public setRandomTarget(): void {
    if (!ArrayUtils.isEmpty(this.filter())) {
      let nextTarget: GalleryImage;
      const currentTarget: GalleryImage = this.target();

      if (currentTarget) {
        if (currentTarget.group) {
          nextTarget = ArrayUtils.getRandom(this.filter(), currentTarget.group.images);
        } else {
          nextTarget = ArrayUtils.getRandom(this.filter(), [currentTarget]);
        }
      } else {
        nextTarget = ArrayUtils.getRandom(this.filter());
      }

      if (nextTarget) {
        this.target.set(nextTarget);
      }
    }
  }

  public setRandomGroupTarget(): void {
    const target: GalleryImage = this.target();
    if (target?.group) {
      this.target.set(ArrayUtils.getRandom(target.group.images, [target]));
    }
  }

  public refreshFilter(forImage?: GalleryImage): void {
    forImage ? this.actuallyRefreshFilter(forImage) : this.images.forEach(image => this.actuallyRefreshFilter(image));
    this.filter.set(this.images.filter(image => image.passesFilter));
  }

  private actuallyRefreshFilter(image: GalleryImage): void {
    if (image.group) {
      if (image.group.open) {
        image.passesFilter = this.doesPassFilter(image);
      } else {
        image.group.images.forEach(groupImage => groupImage.passesFilter = this.doesPassFilter(groupImage));
      }
    } else {
      image.passesFilter = this.doesPassFilter(image);
    }
  }

  private doesPassFilter(image: GalleryImage): boolean {
    if (!image) {
      return false;
    }

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

    const groupSize: number = image.group ? image.group.images.length : 0;
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
    if (image.group && this.targetEntireGroup) {
      image.group.images.forEach(groupImage => groupImage.heart = newValue);
    } else {
      image.heart = newValue;
    }

    this.tagCounts['_heart'] = this.images.filter(i => i.heart).length;
    this.refreshFilter(image);
    this.updateData();
  }

  public toggleBookmark(image: GalleryImage): void {
    const newValue: boolean = !image.bookmark;
    if (image.group && this.targetEntireGroup) {
      image.group.images.forEach(groupImage => groupImage.bookmark = newValue);
    } else {
      image.bookmark = newValue;
    }

    this.tagCounts['_bookmark'] = this.images.filter(i => i.bookmark).length;
    this.refreshFilter(image);
    this.updateData();
  }

  public toggleTag(image: GalleryImage, tag: string): void {
    const tags: string[] = image.tags;
    let groupTags: string[];
    if (image.group && this.targetEntireGroup) {
      if (tags.includes(tag)) {
        for (const groupImage of image.group.images) {
          groupTags = groupImage.tags;
          if (groupTags.includes(tag)) {
            ArrayUtils.remove(groupTags, tag);
          }
        }
      } else {
        for (const groupImage of image.group.images) {
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
    this.updateData();
  }

  public like(image: GalleryImage): void {
    image.likes++;
    this.updateData();
  }

  public dislike(image: GalleryImage): void {
    if (image.likes > 0) {
      image.likes--;
      this.updateData();
    }
  }

  public async remove(image: GalleryImage, archive: boolean): Promise<void> {
    this.applicationService.loading.next(true);
    let nextTarget: GalleryImage;
    if (image.group) {
      nextTarget = ArrayUtils.getNext(image.group.images, image);
      if (!nextTarget) nextTarget = ArrayUtils.getPrevious(image.group.images, image);
    } else {
      nextTarget = ArrayUtils.getNext(this.masonryImages, this.masonryTargetReference);
      if (!nextTarget) nextTarget = ArrayUtils.getPrevious(this.masonryImages, this.masonryTargetReference);
    }

    if (archive) {
      await this.googleService.move(image.id, image.parentFolderId, this.archiveFolderId);
    } else {
      await this.googleService.trash(image.id);
    }

    ArrayUtils.remove(this.images, this.images.find(i => i.id == image.id));

    if (image.group) {
      if (image.group.images.length > 2) {
        ArrayUtils.remove(image.group.images, image);
      } else {
        image.group.images.forEach(groupImage => delete groupImage.group);
        ArrayUtils.remove(this.groups, image.group);
      }
    }

    this.refreshFilter(); // TODO only needed for masonry layout update
    this.target.set(nextTarget);
    this.refreshTagCounts();

    this.updateData();
    this.applicationService.loading.next(false);
  }

}
