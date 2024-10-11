import { nanoid } from 'nanoid';
import { Button } from "../models/components/button.interface";
import { DialogueNode } from "../models/components/dialogue-node.interface";
import { Scenario } from "../models/components/scenario.interface";
import { Action } from "../models/logic/action.model";
import { Condition } from "../models/logic/condition.model";
import { Logic } from "../models/logic/logic.model";
import { Operator } from "../models/logic/operator.enum";
import { Variable } from "../models/logic/variable.model";
import { Character } from '../models/components/character.interface';
import { DialogueLine } from '../models/components/dialogue-line.interface';

export abstract class AdventureFactory {

  public static createScenario(): Scenario {
    return {
      characters: [],
      variables: [],
      nodes: [],
      buttons: [],
      notes: [],
      notesVisible: true
    } as Scenario;
  }

  public static createCharacter(): Character {
    return {
      color: '#FFFFFF'
    } as Character;
  }

  public static createVariable(): Variable {
    return {
      options: []
    } as Variable;
  }

  public static createDialogueNode(): DialogueNode {
    return {
      id: nanoid(),
      lines: [],
      buttonIds: []
    } as DialogueNode;
  }

  public static createDialogueLine(): DialogueLine {
    return {
      
    } as DialogueLine;
  }

  public static createButton(): Button {
    return {
      id: nanoid(),
      logic: [this.createLogic(Operator.ALWAYS)],
      disabled: this.createCondition(Operator.NEVER),
      hidden: this.createCondition(Operator.NEVER)
    } as Button;
  }

  public static createLogic(operator: Operator): Logic {
    return {
      operator: operator,
      conditions: [],
      actions: [this.createAction()]
    } as Logic;
  }

  public static createCondition(operator: Operator): Condition {
    return {
      operator: operator
    } as Condition;
  }

  public static createAction(): Action {
    return {
      weight: 100,
      storyChanges: [],
      variableChanges: []
    } as Action;
  }

}
