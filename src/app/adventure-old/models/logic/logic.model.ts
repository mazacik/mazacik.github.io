import { Action } from "./action.model";
import { Condition } from "./condition.model";
import { Operator } from "./operator.enum";

export interface Logic {

  operator: Operator;
  conditions?: Condition[];
  actions: Action[];

}
