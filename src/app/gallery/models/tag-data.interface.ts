export interface TagData {
  id: string;
  name: string;
  group: boolean;
  state: number;
  comparisonState?: number;

  // Tag
  pseudo: boolean;

  // Tag Group
  childIds: string[];
}
