import { GallerySettings } from "./gallery-settings.interface";
import { GroupProperties } from "./group-properties.interface";
import { ImageProperties } from "./image-properties.interface";
import { Tag } from "./tag.interface";

export interface Data {

  dataFolderId: string;
  archiveFolderId: string;
  settings: GallerySettings;

  imageProperties: ImageProperties[];
  groupProperties: GroupProperties[];

  tags: Tag[];
  heartsFilter: number;
  bookmarksFilter: number;
  groupSizeFilterMin: number;
  groupSizeFilterMax: number;

  comparison: { [key: string]: string[] };

}
