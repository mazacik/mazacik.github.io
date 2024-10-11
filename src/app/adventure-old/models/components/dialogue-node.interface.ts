import { DialogueLine } from "./dialogue-line.interface";

export interface DialogueNode {

  id: string;
  description: string;
  lines: DialogueLine[];
  buttonIds: string[];
  parentScenarioId: string;

}
