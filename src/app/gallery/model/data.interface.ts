import { GallerySettings } from "./gallery-settings.interface";
import { GroupData } from "./group-data.interface";
import { ImageData } from "./image-data.interface";
import { TagGroup } from "./tag-group.interface";

export interface Data {

  dataFolderId: string;
  archiveFolderId: string;
  settings: GallerySettings;

  imageProperties: ImageData[];
  groupProperties: GroupData[];
  tagGroups: TagGroup[];

  heartsFilter: number;
  bookmarksFilter: number;
  groupSizeFilterMin: number;
  groupSizeFilterMax: number;

  comparison: { [key: string]: string[] };

}
