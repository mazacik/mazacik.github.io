import { Filter } from "./filter.interface";

export interface Tag extends Filter {
  id: string;
  name: string;
  parent?: Tag;
  children: Tag[];
  open: boolean;
}
