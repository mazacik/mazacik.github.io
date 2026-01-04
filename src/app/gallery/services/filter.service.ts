import { computed, Injectable, Signal, signal, WritableSignal } from "@angular/core";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { GoogleFileUtils } from "src/app/shared/utils/google-file.utils";
import { Filter } from "../models/filter.class";
import { GalleryImage } from "../models/gallery-image.class";
import { Tag } from "../models/tag.class";
import { GalleryStateService } from "./gallery-state.service";
import { TagService } from "./tag.service";

@Injectable({
  providedIn: 'root',
})
export class FilterService {

  public readonly images: WritableSignal<GalleryImage[]> = signal([]);
  public readonly masonryImages: Signal<GalleryImage[]> = computed(() => this.images().filter(image => image.group ? image == image.group.images.find(groupImage => groupImage.passesFilters) : true));

  public readonly favoritesFilter: Filter = new Filter(0);
  public readonly bookmarksFilter: Filter = new Filter(0);
  public readonly groupsFilter: Filter = new Filter(0);

  constructor(
    private stateService: GalleryStateService,
    private tagService: TagService
  ) { }

  public updateFilters(...images: GalleryImage[]): void {
    (ArrayUtils.isEmpty(images) ? this.stateService.images : images).forEach(image => image.passesFilters = this.doesPassFilters(image));
    this.images.set(this.stateService.images.filter(image => image.passesFilters));
  }

  private doesPassFilters(image: GalleryImage): boolean {
    if (!image) {
      return false;
    }

    if (!this.doesPassFilter(this.favoritesFilter, image.heart)) {
      return false;
    }

    if (!this.doesPassFilter(this.bookmarksFilter, image.bookmark)) {
      return false;
    }

    if (!this.doesPassFilter(this.groupsFilter, image.group != null)) {
      return false;
    }

    if (!this.stateService.settings.showVideos && GoogleFileUtils.isVideo(image)) {
      return false;
    }

    return this.doesPassTagsCheck(image, this.tagService.getRootTags());
  }

  private doesPassFilter(filter: Filter, value: boolean): boolean {
    if (filter.state == -1 && value) {
      return false;
    }

    if (filter.state == 1 && !value) {
      return false;
    }

    return true;
  }

  private doesPassTagsCheck(image: GalleryImage, tags: Tag[]): boolean {
    for (const tag of tags) {
      if (tag.state == 0) {
        if (tag.group) {
          if (!this.doesPassTagsCheck(image, tag.children)) {
            return false;
          }
        }
      } else {
        if (tag.group) {
          const intersection: Tag[] = ArrayUtils.intersection(image.tags, tag.collectChildren().concat(tag));
          if (tag.state == -1 && intersection.length != 0) {
            return false;
          }

          if (tag.state == 1 && intersection.length == 0) {
            return false;
          }
        } else if (tag.pseudo) {
          const intersection: Tag[] = ArrayUtils.intersection(image.tags, tag.children);
          if (tag.state == -1 && intersection.length != 0) {
            return false;
          }

          if (tag.state == 1 && intersection.length == 0) {
            return false;
          }
        } else {
          const imageHasTag: boolean = image.tags.includes(tag);
          if (tag.state == -1 && imageHasTag) {
            return false;
          }

          if (tag.state == 1 && !imageHasTag) {
            return false;
          }
        }
      }
    }

    return true;
  }

}