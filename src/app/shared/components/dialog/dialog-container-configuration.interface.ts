import { DialogButton } from "./dialog-button.class";

export interface DialogContainerConfiguration {

  title: string | (() => string);
  headerButtons?: DialogButton[];
  footerButtons?: DialogButton[];

  hideClickOverlay?: boolean;
  allowMultiple?: boolean;

}
