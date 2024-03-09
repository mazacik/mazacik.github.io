import { Tag } from "./tag.interface";

export interface TagGroup {
  name: string;
  state: number;
  tags: Tag[];
}