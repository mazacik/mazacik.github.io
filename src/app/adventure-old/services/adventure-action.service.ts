import { Injectable } from "@angular/core";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { RandomUtils } from "src/app/shared/utils/random.utils";
import { Button } from "../models/components/button.interface";
import { DialogueNode } from "../models/components/dialogue-node.interface";
import { Scenario } from "../models/components/scenario.interface";
import { Action } from "../models/logic/action.model";
import { Condition } from "../models/logic/condition.model";
import { Operator } from "../models/logic/operator.enum";
import { Variable } from "../models/logic/variable.model";
import { AdventureStateService } from "./adventure-state.service";

@Injectable({
  providedIn: 'root',
})
export class AdventureActionService {

  constructor(
    private stateService: AdventureStateService
  ) { }

  public executeAction(action: Action): string {
    if (action.nextNodeId) {
      const node: DialogueNode = this.stateService.getNodes().find(node => node.id == action.nextNodeId);
      const scenario: Scenario = this.stateService.getScenario(node.parentScenarioId);
      if (this.stateService.currentScenario != scenario) this.stateService.currentScenario = scenario;
      scenario.currentNode = node;
    }

    if (!ArrayUtils.isEmpty(action.storyChanges)) {
      ArrayUtils.push(this.stateService.story, action.storyChanges);
    }

    for (const variableChange of action.variableChanges) {
      const variable: Variable = this.stateService.getVariables().find(variable => variable.id == variableChange.id);
      variable.value = variableChange.value;
    }

    return action.nextNodeId;
  }

  public executeButton(button: Button): void {
    const action: Action = { variableChanges: [] } as Action;
    for (const logic of button.logic) {
      if (this.evaluate(logic)) {
        const _action: Action = this.processActionWeights(logic.actions);
        if (!action.nextNodeId) action.nextNodeId = _action.nextNodeId;
        if (!action.storyChanges) action.storyChanges = _action.storyChanges;
        for (const variableChange of _action.variableChanges) {
          if (!ArrayUtils.includes(action.variableChanges, variableChange, vc => vc.id)) {
            action.variableChanges.push(variableChange);
          }
        }
      }
    }

    this.executeAction(action);
  }

  public executeRandomButton(): void {
    const availableButtons: Button[] = this.stateService.getCurrentNode().buttonIds.map(buttonId => this.stateService.getButton(buttonId)).filter(button => !this.evaluate(button.hidden) && !this.evaluate(button.disabled));
    this.executeButton(RandomUtils.from(availableButtons));
  }

  public processActionWeights(actions: Action[]): Action {
    let sum: number = 0;
    actions.forEach(action => sum += action.weight);
    let random: number = RandomUtils.random(sum);
    for (const action of actions) {
      if (random - action.weight < 0) {
        return action;
      }
    }
  }

  public evaluate(expression: Condition): boolean {
    switch (expression.operator) {
      case Operator.ALWAYS:
        return true;
      case Operator.NEVER:
        return false;
      // case Operator.NOT:
      // return !this.evaluate(expression.operands[0]);
      // case Operator.AND:
      // return ArrayUtils.isEmpty(expression.operands) || expression.operands.every(operand => this.evaluate(operand));
      // case Operator.OR:
      // return ArrayUtils.isEmpty(expression.operands) || expression.operands.some(operand => this.evaluate(operand));
      case Operator.EQ:
        return expression.variable.value == expression.value;
      case Operator.NEQ:
        return expression.variable.value != expression.value;
      case Operator.CHANCE:
        return RandomUtils.percentage(expression.chance);
      default:
        return false;
    }
  }

}
