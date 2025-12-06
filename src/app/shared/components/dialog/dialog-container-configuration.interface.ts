import { DialogButton } from "./dialog-button.class";

export interface DialogContainerConfiguration {

  title: string | (() => string);
  headerButtons?: DialogButton[];
  footerButtons?: DialogButton[];

  waitForContent?: Promise<void>;
  hideClickOverlay?: boolean;
  allowMultiple?: boolean;

}
