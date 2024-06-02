import { BaseSettings } from "src/app/shared/classes/base-settings.interface";

export interface GallerySettings extends BaseSettings {

  showVideos: number;
  autoBookmark: number;

}
