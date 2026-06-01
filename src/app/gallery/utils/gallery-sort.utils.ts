import { GoogleFileUtils } from "src/app/shared/utils/google-file.utils";
import { GalleryGroup } from "../models/gallery-group.class";
import { GalleryImage } from "../models/gallery-image.class";

export abstract class GallerySortUtils {

  public static readonly IMAGE_PREFIX = 'image:';
  public static readonly GROUP_PREFIX = 'group:';

  public static imageSubjectId(imageId: string): string {
    return `${this.IMAGE_PREFIX}${imageId}`;
  }

  public static groupSubjectId(groupId: string): string {
    return `${this.GROUP_PREFIX}${groupId}`;
  }

  public static getSortableSubjectIds(images: GalleryImage[], groups: GalleryGroup[]): string[] {
    const groupedImageIds = new Set((groups ?? []).flatMap(group => group.images.map(image => image.id)));
    const groupSubjectIds = (groups ?? [])
      .filter(group => group.id && group.images.some(image => GoogleFileUtils.isImage(image)))
      .map(group => this.groupSubjectId(group.id));
    const standaloneImageSubjectIds = (images ?? [])
      .filter(image => GoogleFileUtils.isImage(image))
      .filter(image => !groupedImageIds.has(image.id))
      .map(image => this.imageSubjectId(image.id));

    return [...standaloneImageSubjectIds, ...groupSubjectIds];
  }

  public static getSortSubjectId(image: GalleryImage): string {
    if (!image) {
      return null;
    }

    if (image.group?.id) {
      return this.groupSubjectId(image.group.id);
    }

    return this.imageSubjectId(image.id);
  }

  public static resolveSubjectImage(subjectId: string, images: GalleryImage[], groups: GalleryGroup[]): GalleryImage {
    if (subjectId?.startsWith(this.IMAGE_PREFIX)) {
      const imageId = subjectId.slice(this.IMAGE_PREFIX.length);
      return images.find(image => image.id === imageId);
    }

    if (subjectId?.startsWith(this.GROUP_PREFIX)) {
      const groupId = subjectId.slice(this.GROUP_PREFIX.length);
      const group = groups.find(candidate => candidate.id === groupId);
      return group?.images.find(image => GoogleFileUtils.isImage(image)) ?? group?.images[0];
    }

    return images.find(image => image.id === subjectId);
  }

}
