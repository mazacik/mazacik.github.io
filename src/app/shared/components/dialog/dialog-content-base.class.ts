import { DialogContainerConfiguration } from "./dialog-container-configuration.interface";

export abstract class DialogContentBase<ResultType, InputsType = {}> {

  public abstract configuration: DialogContainerConfiguration;
  public resolve: (value: ResultType) => void;
  public submit(): void { this.close(); };
  public abstract close(): void;
  public inputs: InputsType;

}
