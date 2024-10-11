import { Identifiable } from "./identifiable.model";
import { Operator } from "./operator.enum";
import { Variable } from "./variable.model";

export interface Condition {

  operator: Operator;

  variable?: Variable;
  value?: Identifiable;

  chance?: number;

}
