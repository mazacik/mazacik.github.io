import { Tag } from "./tag.interface";

export interface TagGroup {
  name: string;
  // tags: Tag[];
  tags: { actualTag: Tag, name: string }[];
}