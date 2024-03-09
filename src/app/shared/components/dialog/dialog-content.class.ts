import { DialogConfiguration } from "./dialog-configuration.class";

export abstract class DialogContent<T> {

  public resolve: (values: T) => void;
  public abstract configuration: DialogConfiguration;
  public abstract close(): void;

}
