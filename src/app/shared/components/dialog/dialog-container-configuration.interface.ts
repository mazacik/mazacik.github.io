import { DialogButton } from "./dialog-button.class";

export interface DialogContainerConfiguration {

  title: string | (() => string);
  buttons: DialogButton[];

  hideHeaderCloseButton?: boolean;
  hideClickOverlay?: boolean;
  allowMultiple?: boolean;

}
