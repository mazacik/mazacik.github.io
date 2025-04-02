import { DialogContainerConfiguration } from "./dialog-container-configuration.interface";

export abstract class DialogContentBase<ResultType, InputsType = {}> {

  public resolve: (value: ResultType) => void;
  public abstract configuration: DialogContainerConfiguration;
  public abstract close(): void;
  public inputs: InputsType;

}
