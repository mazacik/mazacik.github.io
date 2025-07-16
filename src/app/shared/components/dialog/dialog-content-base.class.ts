import { KeyboardShortcutTarget } from "../../classes/keyboard-shortcut-target.interface";
import { DialogContainerConfiguration } from "./dialog-container-configuration.interface";

export abstract class DialogContentBase<ResultType, InputsType = {}> implements KeyboardShortcutTarget {

  public abstract configuration: DialogContainerConfiguration;
  public resolve: (value: ResultType) => void;
  public submit(): void { this.close(); };
  public abstract close(): void;
  public inputs: InputsType;

  processKeyboardShortcut(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        this.submit();
        return;
      case 'Escape':
        this.close();
        return;
    }
  }

}
