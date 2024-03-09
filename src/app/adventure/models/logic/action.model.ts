import { Identifiable } from "./identifiable.model";

export interface Action {

  weight: number;
  nextNodeId: string;
  storyChanges: Identifiable[];
  variableChanges: Identifiable[];

}
