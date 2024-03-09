import { VariableType } from "./variable-type.enum";

export interface Variable {

  id: string;
  type: VariableType;
  options: { value: string }[];
  initialValue: string;
  value: string;

}
