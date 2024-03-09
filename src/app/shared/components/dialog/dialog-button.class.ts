export interface DialogButton {

  text: () => string;
  hidden?: () => boolean;
  disable?: () => boolean;
  click?: () => void;

}
