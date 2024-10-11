import { RandomUtils } from "src/app/shared/utils/random.utils";
import { Action } from "../models/logic/action.model";
import { Condition } from "../models/logic/condition.model";
import { Operator } from "../models/logic/operator.enum";

export abstract class AdventureActionUtils {

  public static processActionWeights(actions: Action[]): Action {
    let sum: number = 0;
    actions.forEach(action => sum += action.weight);
    let random: number = RandomUtils.random(sum);
    for (const action of actions) {
      if (random - action.weight < 0) {
        return action;
      }
    }
  }

  public static evaluate(expression: Condition): boolean {
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
        return expression.variable.value.id == expression.value.id;
      case Operator.NEQ:
        return expression.variable.value.id != expression.value.id;
      case Operator.CHANCE:
        return RandomUtils.percentage(expression.chance);
      default:
        return false;
    }
  }

}
