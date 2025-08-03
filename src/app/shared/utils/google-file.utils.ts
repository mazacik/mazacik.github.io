import { GoogleMetadata } from "../classes/google-api/google-metadata.class";
import { GalleryImage } from "../../gallery/models/gallery-image.class";

export abstract class GoogleFileUtils {

  public static isImage(entity: GoogleMetadata): boolean {
    return entity.mimeType.includes('image') && (entity as GalleryImage).thumbnailLink != null;
  }

  public static isVideo(entity: GoogleMetadata): boolean {
    return entity.mimeType.includes('video') && (entity as GalleryImage).thumbnailLink != null;
  }

  public static isFolder(entity: GoogleMetadata): boolean {
    return entity.mimeType == 'application/vnd.google-apps.folder';
  }

}
