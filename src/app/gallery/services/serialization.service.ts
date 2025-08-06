import { Injectable, Injector } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { GalleryGroup } from "src/app/gallery/models/gallery-group.class";
import { GalleryImage } from "src/app/gallery/models/gallery-image.class";
import { Delay } from "src/app/shared/classes/delay.class";
import { GoogleMetadata } from "src/app/shared/classes/google-api/google-metadata.class";
import { ApplicationService } from "src/app/shared/services/application.service";
import { DialogService } from "src/app/shared/services/dialog.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { GoogleFileUtils } from "src/app/shared/utils/google-file.utils";
import { GallerySettingsComponent } from "../dialogs/settings/gallery-settings.component";
import { Data } from "../models/data.interface";
import { GroupData } from "../models/group-data.interface";
import { ImageData } from "../models/image-data.interface";
import { TagData } from "../models/tag-data.interface";
import { Tag } from "../models/tag.class";
import { FilterService } from "./filter.service";
import { GalleryGoogleDriveService } from "./gallery-google-drive.service";
import { GalleryStateService } from "./gallery-state.service";
import { TagService } from "./tag.service";

@Injectable({
  providedIn: 'root',
})
export class SerializationService {

  constructor(
    private injector: Injector,
    private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private dialogService: DialogService,
    private googleService: GalleryGoogleDriveService
  ) { }

  public async processData(): Promise<void> {
    const stateService: GalleryStateService = this.injector.get(GalleryStateService);

    const data: Data = await this.googleService.getData();
    stateService.dataFolderId = data.dataFolderId;
    stateService.archiveFolderId = data.archiveFolderId;
    stateService.comparison = data.comparison;

    const filterService: FilterService = this.injector.get(FilterService);
    filterService.filterFavorites.state = data.heartsFilter || 0;
    filterService.filterBookmarks.state = data.bookmarksFilter || 0;
    filterService.filterGroups.state = data.filterGroups || 0;

    if (!data.imageProperties) data.imageProperties = [];
    if (!data.groupProperties) data.groupProperties = [];
    if (!data.tagProperties) data.tagProperties = [];

    const tagService: TagService = this.injector.get(TagService);
    ArrayUtils.push(tagService.tags, data.tagProperties.map(data => this.parseTag(data)));
    tagService.tags.forEach(tag => tag.children = data.tagProperties.find(t => t.id == tag.id).childIds.map(childId => tagService.tags.find(t => t.id == childId)));
    tagService.tags.forEach(tag => tag.parent = tagService.tags.find(t => t.children.includes(tag)));

    if (data.settings) {
      stateService.settings = data.settings;
    } else {
      await this.dialogService.create(GallerySettingsComponent);
    }

    const recursionTracker: Set<Promise<void>> = new Set<Promise<void>>();
    await this.processImages(data, stateService.dataFolderId, stateService.images, tagService.tags, recursionTracker);
    await Promise.all(recursionTracker);

    for (const imageProperty of data.imageProperties.filter(imageProperty => !stateService.images.some(galleryImage => imageProperty.id == galleryImage.id))) {
      console.log(imageProperty);
      console.log('This image does not exist, but has a data entry. Removing image entry from data.');
      ArrayUtils.remove(stateService.images, stateService.images.find(galleryImage => galleryImage.id == imageProperty.id));
    }

    ArrayUtils.push(stateService.imageGroups, data.groupProperties.map(groupProperties => {
      const group: GalleryGroup = new GalleryGroup();
      group.images = stateService.images.filter(image => groupProperties.imageIds.includes(image.id));
      group.images.sort((a, b) => groupProperties.imageIds.indexOf(a.id) - groupProperties.imageIds.indexOf(b.id));
      group.images.forEach(image => image.group = group);
      return group;
    }));

    filterService.updateFilters();
    this.applicationService.loading.set(false);
    if (!data.settings) this.save();
  }

  private async processImages(data: Data, folderId: string, collector: GalleryImage[], tags: Tag[], recursionTracker: Set<Promise<void>>): Promise<void> {
    const metadata: GoogleMetadata[] = await this.googleService.getFolderMetadata(folderId);
    for (const folder of metadata.filter(entity => GoogleFileUtils.isFolder(entity))) {
      recursionTracker.add(this.processImages(data, folder.id, collector, tags, recursionTracker));
    }

    ArrayUtils.push(collector, metadata.filter(meta => GoogleFileUtils.isImage(meta) || GoogleFileUtils.isVideo(meta)).map(imageMetadata => this.metaToImage(imageMetadata, data.imageProperties.find(imageProperty => imageProperty.id == imageMetadata.id), folderId, tags, this.applicationService.reduceBandwidth)));
  }

  private metaToImage(metadata: GoogleMetadata, properties: ImageData, parentFolderId: string, tags: Tag[], reduceBandwidth: boolean): GalleryImage {
    const image: GalleryImage = new GalleryImage();
    image.id = metadata.id;
    image.name = metadata.name;
    image.mimeType = metadata.mimeType;
    image.parentFolderId = parentFolderId;

    if (reduceBandwidth) {
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

    if (properties) {
      image.heart = properties.heart;
      image.bookmark = properties.bookmark;
      image.tags = properties.tagIds.map(tagId => tags.find(tag => tag.id == tagId));
    } else {
      image.heart = false;
      image.bookmark = true;
      image.tags = [];
    }

    return image;
  }

  private parseTag(data: TagData): Tag {
    const tag: Tag = new Tag();
    tag.id = data.id;
    tag.name = data.name;
    tag.group = data.group;
    tag.state = data.state;
    tag.open = false;
    return tag;
  }

  private readonly saveDelay: Delay = new Delay(5000);
  public save(instant: boolean = false): void {
    this.applicationService.changes.set(true);
    this.saveDelay.restart(() => this.serialize());
    if (instant) this.saveDelay.complete();
  }

  private serialize(): void {
    const stateService: GalleryStateService = this.injector.get(GalleryStateService);
    const filterService: FilterService = this.injector.get(FilterService);
    const tagService: TagService = this.injector.get(TagService);

    const data: Data = {} as Data;
    data.dataFolderId = stateService.dataFolderId;
    data.archiveFolderId = stateService.archiveFolderId;
    data.heartsFilter = filterService.filterFavorites.state;
    data.bookmarksFilter = filterService.filterBookmarks.state;
    data.filterGroups = filterService.filterGroups.state;
    data.settings = stateService.settings;
    data.comparison = stateService.comparison;
    data.imageProperties = stateService.images.map(image => this.serializeImage(image));
    data.groupProperties = stateService.imageGroups.filter(group => !ArrayUtils.isEmpty(group.images)).map(group => this.serializeGroup(group));
    data.tagProperties = tagService.tags.map(tag => this.serializeTag(tag));

    this.googleService.updateContent(this.googleService.dataFileId, data).then(metadata => {
      if (!metadata) {
        this.applicationService.errors.set(true);
      }
    }).finally(() => {
      this.applicationService.changes.set(false);
    });
  }

  private serializeImage(image: GalleryImage): ImageData {
    const _image: ImageData = {} as ImageData;
    _image.id = image.id;
    _image.heart = image.heart;
    _image.bookmark = image.bookmark;
    _image.tagIds = image.tags.map(tag => tag.id);
    return _image;
  }

  private serializeGroup(group: GalleryGroup): GroupData {
    const _group: GroupData = {} as GroupData;
    _group.imageIds = group.images.map(image => image.id);
    return _group;
  }

  public serializeTag(tag: Tag): TagData {
    const tagData: TagData = {} as TagData;
    tagData.id = tag.id;
    tagData.name = tag.name;
    tagData.group = tag.group;
    tagData.state = tag.state;
    tagData.childIds = tag.children.map(c => c.id);
    return tagData;
  }

}
