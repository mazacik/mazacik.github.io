import { Filter } from "./filter.interface";

export interface Tag extends Filter {
  id: string;
  name: string;
}