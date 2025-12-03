export interface DialogButton {

  id: string;
  text?: string | (() => string);
  iconClass?: string | (() => string);
  hidden?: () => boolean;
  disabled?: () => boolean;
  click?: () => void;

}
