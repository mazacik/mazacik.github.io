import { Variable } from "../logic/variable.model";
import { Button } from "./button.interface";
import { Character } from "./character.interface";
import { DialogueNode } from "./dialogue-node.interface";
import { Note } from "./note.interface";

export interface Scenario {

  id: string;
  label: string;
  characters: Character[];
  variables: Variable[];
  nodes: DialogueNode[];
  buttons: Button[];
  notes: Note[];

  currentNode: DialogueNode;
  currentNote: Note;

}
