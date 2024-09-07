import { Injectable } from "@angular/core";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { Button } from "../models/components/button.interface";
import { Character } from "../models/components/character.interface";
import { DialogueNode } from "../models/components/dialogue-node.interface";
import { Note } from "../models/components/note.interface";
import { Scenario } from "../models/components/scenario.interface";
import { SerializableAdventure } from "../models/components/serializable-adventure.interface";
import { Identifiable } from "../models/logic/identifiable.model";
import { Operator } from "../models/logic/operator.enum";
import { Variable } from "../models/logic/variable.model";
import { AdventureFactory } from "../utils/adventure.factory";
import { NotesService } from "../components/notes/notes.service";

@Injectable({
  providedIn: 'root',
})
export class AdventureStateService {

  public scenarios: Scenario[];
  public currentScenario: Scenario;

  public story: Identifiable[];

  constructor(
    private notesService: NotesService
  ) { }

  public getCurrentNode(): DialogueNode {
    return this.currentScenario?.currentNode;
  }

  public getScenario(scenarioId: string): Scenario {
    return this.scenarios.find(scenario => scenario.id == scenarioId);
  }

  // TODO computed signal as cache
  public getNodes(): DialogueNode[] {
    return this.scenarios.flatMap(scenario => scenario.nodes);
  }

  // TODO computed signal as cache
  public getButtons(): Button[] {
    return this.scenarios.flatMap(scenario => scenario.buttons);
  }

  public getButtonsForNode(node: DialogueNode = this.getCurrentNode()): Button[] {
    return node?.buttonIds.map(buttonId => this.getButton(buttonId, this.getScenario(node.parentScenarioId)));
  }

  // TODO computed signal as cache
  public getCharacters(): Character[] {
    return this.scenarios.flatMap(scenario => scenario.characters);
  }

  // TODO computed signal as cache
  public getVariables(): Variable[] {
    return this.scenarios.flatMap(scenario => scenario.variables);
  }

  public getNode(nodeId: string): DialogueNode {
    if (nodeId) {
      return this.getNodes().find(node => node.id == nodeId);
    }
  }

  public getButton(buttonId: string, scenario?: Scenario): Button {
    if (buttonId) {
      if (scenario) {
        return scenario.buttons.find(button => button.id == buttonId);
      } else {
        return this.getButtons().find(button => button.id == buttonId);
      }
    }
  }

  public getCharacter(characterId: string): Character {
    if (characterId) {
      return this.getCharacters().find(character => character.id == characterId);
    }
  }

  public getVariable(variableId: string): Variable {
    if (variableId) {
      return this.getVariables().find(variable => variable.id == variableId);
    }
  }

  public initialize(serializable: SerializableAdventure): void {
    if (serializable) {
      if (serializable.scenarios) {
        this.scenarios = serializable.scenarios;

        // serialization fixes
        for (const scenario of this.scenarios) {

        }

        this.notesService.openNote(this.scenarios[0].notes[0], true);

        for (const scenario of this.scenarios) {
          scenario.currentNode = scenario.nodes[0];

          for (const node of scenario.nodes) {
            node.parentScenarioId = scenario.id;
          }

          for (const note of scenario.notes) {
            note.parentScenario = scenario;
            note.wordCount = StringUtils.getWordCount(note.text);
          }

          for (const button of scenario.buttons) {
            if (!button.logic) button.logic = [AdventureFactory.createLogic(Operator.ALWAYS)];
          }
        }

        this.currentScenario = serializable.scenarios[0];
        this.currentScenario.notesVisible = true;
        this.story = [];
      }
    }
  }

  public serialize(): SerializableAdventure {
    return {
      scenarios: this.scenarios.map(scenario => {
        return {
          id: scenario.id,
          label: scenario.label,
          characters: scenario.characters.map(character => {
            return {
              id: character.id,
              name: character.name,
              color: character.color,
            } as Character;
          }),
          variables: scenario.variables.map(variable => {
            return {
              id: variable.id,
              type: variable.type,
              options: variable.options,
              initialValue: variable.initialValue
            } as Variable;
          }),
          nodes: scenario.nodes.map(node => {
            return {
              id: node.id,
              description: node.description,
              lines: node.lines,
              buttonIds: node.buttonIds
            } as DialogueNode;
          }),
          buttons: scenario.buttons.map(button => {
            return {
              id: button.id,
              text: button.text,
              tooltip: button.tooltip,
              logic: button.logic,
              disabled: button.disabled,
              hidden: button.hidden
            } as Button;
          }),
          notes: scenario.notes.map(note => {
            return {
              label: note.label,
              text: note.text
            } as Note;
          })
        }
      })
    } as SerializableAdventure;
  }

}
