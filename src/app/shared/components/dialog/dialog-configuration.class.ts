import { DialogButton } from "./dialog-button.class";

export interface DialogConfiguration {

  title: string;
  buttons: DialogButton[];
  hideTopRightCloseButton?: boolean;

}
