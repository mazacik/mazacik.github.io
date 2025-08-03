import { GallerySettings } from "./gallery-settings.interface";
import { GroupData } from "./group-data.interface";
import { ImageData } from "./image-data.interface";
import { TagData } from "./tag-data.interface";

export interface Data {

  dataFolderId: string;
  archiveFolderId: string;
  settings: GallerySettings;

  imageProperties: ImageData[];
  groupProperties: GroupData[];
  tagProperties: TagData[];

  heartsFilter: number;
  bookmarksFilter: number;
  filterGroups: number;

  comparison: { [key: string]: string[] };

}
