export interface TagData {
  id: string;
  name: string;
  group: boolean;
  state: number;

  // Tag
  pseudo: boolean;

  // Tag Group
  childIds: string[];
}
