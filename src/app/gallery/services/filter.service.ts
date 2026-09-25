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

  private tagFiltersInvert: boolean = false;

  constructor(
    private stateService: GalleryStateService,
    private tagService: TagService
  ) { }

  public isTagFiltersInvert(): boolean {
    return this.tagFiltersInvert;
  }

  public invertTagFilters(value: boolean = !this.tagFiltersInvert): void {
    this.tagFiltersInvert = value;
    this.updateFilters();
  }

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

    return this.doesPassTagsCheck(image, this.tagService.getRootTags()) != this.tagFiltersInvert;
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

  private doesPassTagsCheck(image: GalleryImage, roots: Tag[]): boolean {
    const tags = roots.flatMap(root => [root, ...root.collectChildren()]);
    let hasIncludedTag = false;

    // Explicit tag filters take priority over group filters. Red tags still veto
    // matches, and multiple green tags retain their existing AND behavior.
    for (const tag of tags) {
      if (tag.group || tag.state === 0) continue;
      const matches = tag.pseudo
        ? tag.children.some(child => image.tags.includes(child))
        : image.tags.includes(tag);
      if (!this.doesPassFilter(tag, matches)) return false;
      if (tag.state === 1) hasIncludedTag = true;
    }
    if (hasIncludedTag) return true;

    const groups = tags.filter(tag => tag.group && tag.state !== 0);
    const includedGroups = groups.filter(group => group.state === 1);
    const matchesGroup = (group: Tag): boolean => group.collectChildren()
      .some(child => !child.group && !child.pseudo && image.tags.includes(child));

    // A green subgroup narrows its ancestor's inclusion to the more specific
    // selection. Independent green branches still combine with OR.
    const specificIncludes = includedGroups.filter(group =>
      !group.collectChildren().some(child => child.group && child.state === 1));

    for (const group of groups.filter(group => group.state === -1)) {
      if (!matchesGroup(group)) continue;
      // A matching green subgroup is an exception to its red ancestors.
      const includedDescendants = specificIncludes.filter(child => child.collectParents().includes(group));
      if (!includedDescendants.some(matchesGroup)) return false;
    }

    return includedGroups.length === 0 || specificIncludes.some(matchesGroup);
  }

}
