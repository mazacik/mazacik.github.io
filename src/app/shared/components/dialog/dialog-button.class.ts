export interface DialogButton {

  text?: string | (() => string);
  iconClass?: string | (() => string);
  hidden?: () => boolean;
  disabled?: () => boolean;
  click?: () => void;

}
