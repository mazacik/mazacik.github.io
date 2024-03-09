import { GroupProperties } from "./group-properties.interface";
import { ImageProperties } from "./image-properties.interface";
import { TagGroup } from "./tag-group.interface";

export interface Data {

  rootFolderId: string;
  heartsFilter: number;
  bookmarksFilter: number;
  groupSizeFilterMin: number;
  groupSizeFilterMax: number;
  tagGroups: TagGroup[];
  imageProperties: ImageProperties[];
  groupProperties: GroupProperties[];

}
