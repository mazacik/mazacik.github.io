import { computed, Injectable, Signal, signal, WritableSignal } from "@angular/core";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { GoogleFileUtils } from "src/app/shared/utils/google-file.utils";
import { Filter } from "../models/filter.class";
import { GalleryImage } from "../models/gallery-image.class";
import { Tag } from "../models/tag.class";
import { GalleryStateService } from "./gallery-state.service";
import { TagService } from "./tag.service";

export class GalleryImageFilter {

  public readonly images: WritableSignal<GalleryImage[]> = signal([]);
  public readonly hasCriteria = signal(false);

  public readonly favoritesFilter: Filter = new Filter(0);
  public readonly bookmarksFilter: Filter = new Filter(0);
  public readonly groupsFilter: Filter = new Filter(0);

  public tagFiltersInvert = false;

  constructor(
    private stateService: GalleryStateService,
    private tagService: TagService,
    private readonly matchProperty: 'passesFilters' | 'passesComparisonFilter'
  ) { }

  public forTag(tag: Tag): Filter {
    return this.matchProperty === 'passesFilters' ? tag : tag.comparisonFilter;
  }

  public invertTagFilters(value: boolean = !this.tagFiltersInvert): void {
    this.tagFiltersInvert = value;
    this.updateFilters();
  }

  public updateFilters(...images: GalleryImage[]): void {
    const activeTags = this.tagService.getRootTags().flatMap(root => [root, ...root.collectChildren()])
      .filter(tag => this.forTag(tag).state !== 0);
    this.hasCriteria.set(!!(activeTags.length || this.tagFiltersInvert || this.favoritesFilter.state || this.bookmarksFilter.state || this.groupsFilter.state));
    (ArrayUtils.isEmpty(images) ? this.stateService.images : images).forEach(image => image[this.matchProperty] = this.doesPassFilters(image, activeTags));
    this.images.set(this.stateService.images.filter(image => image[this.matchProperty]));
  }

  private doesPassFilters(image: GalleryImage, activeTags: Tag[]): boolean {
    if (!image || (this.matchProperty === 'passesComparisonFilter' && !GoogleFileUtils.isImage(image))) {
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

    return this.doesPassTagsCheck(image, activeTags) !== this.tagFiltersInvert;
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
    if (tags.length === 0) return true;
    const includedTags: Tag[] = [];

    // Explicit tag filters use AND semantics. They may narrow or override only
    // their ancestor groups; unrelated group filters still apply.
    for (const tag of tags) {
      const filter = this.forTag(tag);
      if (tag.group) continue;
      const matches = tag.pseudo
        ? tag.children.some(child => image.tags.includes(child))
        : image.tags.includes(tag);
      if (!this.doesPassFilter(filter, matches)) return false;
      if (filter.state === 1) includedTags.push(tag);
    }

    const groups = tags.filter(tag => tag.group);
    const includedGroups = groups.filter(group => this.forTag(group).state === 1);
    const matchesGroup = (group: Tag): boolean => group.collectChildren()
      .some(child => !child.group && !child.pseudo && image.tags.includes(child));
    const isOverriddenByIncludedTag = (group: Tag): boolean => includedTags
      .some(tag => tag.collectParents().includes(group));

    // A green subgroup narrows its ancestor's inclusion to the more specific
    // selection. Independent green branches still combine with OR.
    const specificIncludes = includedGroups.filter(group =>
      !group.collectChildren().some(child => child.group && this.forTag(child).state === 1));

    for (const group of groups.filter(group => this.forTag(group).state === -1)) {
      if (!matchesGroup(group)) continue;
      // Matching green descendants are exceptions to their red ancestors.
      const includedDescendants = specificIncludes.filter(child => child.collectParents().includes(group));
      if (!includedDescendants.some(matchesGroup) && !isOverriddenByIncludedTag(group)) return false;
    }

    return includedGroups.length === 0 || specificIncludes
      .some(group => matchesGroup(group) || isOverriddenByIncludedTag(group));
  }

}

@Injectable({ providedIn: 'root' })
export class FilterService {
  public readonly masonry: GalleryImageFilter;
  public readonly comparison: GalleryImageFilter;
  public readonly masonryImages: Signal<GalleryImage[]> = computed(() => this.masonry.images().filter(image =>
    !image.group || image === image.group.images.find(member => member.passesFilters)));

  constructor(state: GalleryStateService, tags: TagService) {
    this.masonry = new GalleryImageFilter(state, tags, 'passesFilters');
    this.comparison = new GalleryImageFilter(state, tags, 'passesComparisonFilter');
  }

  public updateFilters(...images: GalleryImage[]): void {
    this.masonry.updateFilters(...images);
    this.comparison.updateFilters(...images);
  }
}
