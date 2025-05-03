import { Injectable, WritableSignal, signal } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { GalleryGroup } from "src/app/gallery/model/gallery-group.class";
import { GalleryImage } from "src/app/gallery/model/gallery-image.class";
import { Delay } from "src/app/shared/classes/delay.class";
import { GoogleMetadata } from "src/app/shared/classes/google-api/google-metadata.class";
import { ApplicationService } from "src/app/shared/services/application.service";
import { DialogService } from "src/app/shared/services/dialog.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { GoogleFileUtils } from "src/app/shared/utils/google-file.utils";
import { GallerySettingsComponent } from "../dialogs/settings/gallery-settings.component";
import { Data } from "../model/data.interface";
import { Filter } from "../model/filter.interface";
import { GallerySettings } from "../model/gallery-settings.interface";
import { GroupData } from "../model/group-data.interface";
import { ImageData } from "../model/image-data.interface";
import { TagGroup } from "../model/tag-group.interface";
import { Tag } from "../model/tag.interface";
import { GalleryGoogleDriveService } from "./gallery-google-drive.service";

@Injectable({
  providedIn: 'root',
})
export class GalleryStateService {

  // TODO this service is way too large

  private updateDelay: Delay = new Delay(5000);

  public dataFolderId: string;
  public archiveFolderId: string;
  public settings: GallerySettings;

  public readonly images: GalleryImage[] = [];
  public groups: GalleryGroup[];
  public filter: WritableSignal<GalleryImage[]> = signal([]);
  public target: WritableSignal<GalleryImage> = signal(null);

  public tags: Tag[];
  public openTagGroup: TagGroup;

  public filterFavorite: Filter = {};
  public filterBookmark: Filter = {};
  public filterGroupSizeMin: Filter = {};
  public filterGroupSizeMax: Filter = {};

  public groupEditorGroup: GalleryGroup;

  public comparison: { [key: string]: string[] };

  constructor(
    private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private googleService: GalleryGoogleDriveService,
    private dialogService: DialogService
  ) { }

  public async processData(): Promise<void> {
    const data: Data = await this.googleService.getData();
    this.dataFolderId = data.dataFolderId;
    this.archiveFolderId = data.archiveFolderId;
    this.filterFavorite.state = data.heartsFilter;
    this.filterBookmark.state = data.bookmarksFilter;
    this.filterGroupSizeMin.state = data.groupSizeFilterMin;
    this.filterGroupSizeMax.state = data.groupSizeFilterMax;
    this.comparison = data.comparison;
    this.tags = data.tags;

    if (data.settings) {
      this.settings = data.settings;
    } else {
      await this.dialogService.create(GallerySettingsComponent);
    }

    const recursionTracker: Set<Promise<void>> = new Set<Promise<void>>();
    await this.processImages(data, this.dataFolderId, this.images, recursionTracker);
    await Promise.all(recursionTracker);

    for (const imageProperty of data.imageProperties.filter(imageProperty => !this.images.some(galleryImage => imageProperty.id == galleryImage.id))) {
      console.log(imageProperty);
      console.log('This image does not exist, but has a data entry. Removing image entry from data.');
      ArrayUtils.remove(this.images, this.images.find(galleryImage => galleryImage.id == imageProperty.id));
    }

    this.groups = data.groupProperties.map(groupProperties => {
      const group: GalleryGroup = new GalleryGroup();
      group.images = this.images.filter(image => groupProperties.imageIds.includes(image.id));
      group.images.sort((a, b) => groupProperties.imageIds.indexOf(a.id) - groupProperties.imageIds.indexOf(b.id));
      group.images.forEach(image => image.group = group);
      return group;
    });

    // if (this.comparison && Object.keys(this.comparison).length > 0) {
    //   // clean comparison (remove missing entries)
    //   const contenders: Contender<GalleryImage>[] = this.images.map(image => new Contender<GalleryImage>(image.id, image));
    //   contenders.forEach(contender => contender.directlyBetterThan = this.comparison[contender.id].map(directlyBetterThanId => contenders.find(c => c.id == directlyBetterThanId)));
    //   this.images = TournamentUtils.getLeaderboard(TournamentUtils.getFirst(contenders), contenders).map(contender => contender.object);
    // }

    this.updateFilters();
    this.applicationService.loading.set(false);
    if (!data.settings) this.save();
  }

  private async processImages(data: Data, folderId: string, imageCollector: GalleryImage[], recursionTracker: Set<Promise<void>>): Promise<void> {
    const metadata: GoogleMetadata[] = await this.googleService.getFolderMetadata(folderId);
    for (const folder of metadata.filter(entity => GoogleFileUtils.isFolder(entity))) {
      recursionTracker.add(this.processImages(data, folder.id, imageCollector, recursionTracker));
    }

    ArrayUtils.push(imageCollector, metadata.filter(meta => GoogleFileUtils.isImage(meta) || GoogleFileUtils.isVideo(meta)).map(imageMetadata => this.metaToImage(imageMetadata, data.imageProperties.find(imageProperty => imageProperty.id == imageMetadata.id), folderId, this.applicationService.reduceBandwidth)));
  }

  private metaToImage(metadata: GoogleMetadata, imageProperties: ImageData, folderId: string, bReduceBandwidth: boolean): GalleryImage {
    const image: GalleryImage = new GalleryImage();
    image.id = metadata.id;
    image.name = metadata.name;
    image.mimeType = metadata.mimeType;
    image.parentFolderId = folderId;

    if (bReduceBandwidth) {
      image.thumbnailLink = metadata.thumbnailLink;
    } else {
      image.thumbnailLink = metadata.thumbnailLink.replace('=s220', '=w440');
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

    if (imageProperties) {
      image.heart = imageProperties.heart;
      image.bookmark = imageProperties.bookmark;
      image.tags = imageProperties.tagIds || [];
    } else {
      if (this.settings.autoBookmark) image.bookmark = true;
      image.tags = [];
    }

    return image;
  }

  public save(instant: boolean = false): void {
    this.applicationService.changes.set(true);
    this.updateDelay.restart(() => {
      const data: Data = {} as Data;
      data.dataFolderId = this.dataFolderId;
      data.archiveFolderId = this.archiveFolderId;
      data.heartsFilter = this.filterFavorite.state;
      data.bookmarksFilter = this.filterBookmark.state;
      data.groupSizeFilterMin = 0;
      data.groupSizeFilterMax = 999;
      data.tags = this.tags;
      data.settings = this.settings;
      data.comparison = this.comparison;
      data.imageProperties = this.images.map(image => this.serializeImage(image));
      data.groupProperties = this.groups.filter(group => !ArrayUtils.isEmpty(group.images)).map(group => this.serializeGroup(group));

      this.tags.forEach(tag => delete (tag as any).id);

      this.googleService.updateContent(this.googleService.dataFileId, data).then(metadata => {
        if (!metadata) {
          this.applicationService.errors.set(true);
        }
      }).finally(() => {
        this.applicationService.changes.set(false);
      });
    });

    if (instant) this.updateDelay.complete();
  }

  private serializeImage(galleryImage: GalleryImage): ImageData {
    const image: ImageData = {} as ImageData;
    image.id = galleryImage.id;
    image.heart = galleryImage.heart;
    image.bookmark = galleryImage.bookmark;
    image.tagIds = galleryImage.tags;
    return image;
  }

  private serializeGroup(galleryGroup: GalleryGroup): GroupData {
    const group: GroupData = {} as GroupData;
    group.imageIds = galleryGroup.images.map(image => image.id)
    return group;
  }

  public updateFilters(image?: GalleryImage): void {
    image ? image.passesFilter = this.doesPassFilter(image) : this.images.forEach(image => image.passesFilter = this.doesPassFilter(image));
    this.filter.set(this.images.filter(image => image.passesFilter));
  }

  private doesPassFilter(image: GalleryImage): boolean {
    if (!image) {
      return false;
    }

    if (this.filterFavorite.state == -1 && image.heart) {
      return false;
    }

    if (this.filterFavorite.state == 1 && !image.heart) {
      return false;
    }

    if (this.filterBookmark.state == -1 && image.bookmark) {
      return false;
    }

    if (this.filterBookmark.state == 1 && !image.bookmark) {
      return false;
    }

    if (this.settings.showVideos == -1 && GoogleFileUtils.isVideo(image)) {
      return false;
    }

    const groupSize: number = image.group ? image.group.images.length : 0;
    if (groupSize < this.filterGroupSizeMin.state) {
      return false;
    }

    if (groupSize > this.filterGroupSizeMax.state) {
      return false;
    }

    let hasTag: boolean;
    for (const tag of this.tags) {
      hasTag = image.tags.includes(tag.name);
      if (tag.state == -1 && hasTag) {
        return false;
      }

      if (tag.state == 1 && !hasTag) {
        return false;
      }
    }

    return true;
  }

  public toggleFavorite(image: GalleryImage, save: boolean = false): void {
    image.heart = !image.heart;
    if (save) {
      this.updateFilters(image);
      this.save();
    }
  }

  public toggleBookmark(image: GalleryImage, save: boolean = false): void {
    image.bookmark = !image.bookmark;
    if (save) {
      this.updateFilters(image);
      this.save();
    }
  }

  public toggleTag(image: GalleryImage, tag: Tag, save: boolean = false): void {
    ArrayUtils.toggle(image.tags, tag.name);
    if (save) {
      this.updateFilters(image);
      this.save();
    }
  }

  public async delete(image: GalleryImage, archive: boolean, askForConfirmation: boolean = true): Promise<void> {
    if (askForConfirmation && !await this.dialogService.createConfirmation('Confirmation', ['Are you sure you want to ' + (archive ? 'archive' : 'delete') + ' this image?'], 'Yes', 'No')) {
      return;
    }

    this.applicationService.loading.set(true);

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

    if (this.comparison != null) {
      for (const imageIds of Object.values(this.comparison)) {
        if (imageIds.includes(image.id)) {
          ArrayUtils.remove(imageIds, image.id);
        }
      }
    }

    this.filter.set(this.images.filter(image => image.passesFilter));
    this.target.set(null);

    this.save(true);
    this.applicationService.loading.set(false);
  }

}
