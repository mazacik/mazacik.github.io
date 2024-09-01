import { GallerySettings } from "./gallery-settings.interface";
import { GroupProperties } from "./group-properties.interface";
import { ImageProperties } from "./image-properties.interface";
import { TagGroup } from "./tag-group.interface";

export interface Data {

  dataFolderId: string;
  archiveFolderId: string;
  settings: GallerySettings;

  imageProperties: ImageProperties[];
  groupProperties: GroupProperties[];
  tagGroups: TagGroup[];

  heartsFilter: number;
  bookmarksFilter: number;
  groupSizeFilterMin: number;
  groupSizeFilterMax: number;

  comparison: { [key: string]: string[] };

}
