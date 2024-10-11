import { Condition } from "../logic/condition.model";
import { Logic } from "../logic/logic.model";

export interface Button {

  id: string;
  text?: string;
  tooltip?: string;
  logic: Logic[];
  disabled: Condition;
  hidden: Condition;

}
