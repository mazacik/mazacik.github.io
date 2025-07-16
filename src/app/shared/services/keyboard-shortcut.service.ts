import { Injectable } from "@angular/core";
import { KeyboardShortcutTarget } from "../classes/keyboard-shortcut-target.interface";
import { ArrayUtils } from "../utils/array.utils";

@Injectable({
  providedIn: 'root',
})
export class KeyboardShortcutService {

  private stack: KeyboardShortcutTarget[] = [];

  public register(target: KeyboardShortcutTarget): void {
    ArrayUtils.makeFirst(this.stack, target);
  }

  public unregister(target: KeyboardShortcutTarget): void {
    ArrayUtils.remove(this.stack, target);
  }

  public next(event: KeyboardEvent): void {
    console.log(this.stack);

    const targetNodeName: string = (event.target as HTMLElement).nodeName;
    const focusIsUserInput: boolean = !['BODY', 'VIDEO'].includes(targetNodeName);

    if (focusIsUserInput) {
      switch (event.key) {
        case 'Enter':
          ArrayUtils.getFirst(this.stack)?.processKeyboardShortcut(event);
          break;
        case 'Escape':
          (document.activeElement as HTMLElement).blur();
          break;
      }
    } else {
      ArrayUtils.getFirst(this.stack)?.processKeyboardShortcut(event);
    }
  }

  public requestFocus(target: KeyboardShortcutTarget): void {
    ArrayUtils.makeFirst(this.stack, target);
  }

}
