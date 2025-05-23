import { Directive, Input, ViewContainerRef } from "@angular/core";

@Directive({
  selector: '[dragdrop]',
  standalone: true
})
export class DragDropDirective<T> {

  // TODO this is broken. reproduce using group manager.

  private static currentArray: unknown[];
  private static currentIndex: number;

  @Input('dragdrop') object: T;
  @Input('dragdropParent') array: T[];

  constructor(vcr: ViewContainerRef) {
    const element: HTMLElement = vcr.element.nativeElement;
    element.draggable = true;
    element.ondragstart = () => DragDropDirective.onDragStart(this.array, this.array.indexOf(this.object));
    element.ondragenter = () => DragDropDirective.onDragEnter(this.array, this.array.indexOf(this.object));
    element.ondragend = () => DragDropDirective.onDragEnd(this.array);
    element.ondragover = (event) => event.preventDefault();
  }

  private static onDragStart(array: unknown[], index: number): void {
    if (this.currentArray == null && this.currentIndex == null) {
      this.currentArray = array;
      this.currentIndex = index;
    }
  }

  private static onDragEnter(array: unknown[], index: number): void {
    if (this.currentArray == array && this.currentIndex != index) {
      this.currentArray.splice(index, 0, this.currentArray.splice(this.currentIndex, 1)[0]);
      this.currentIndex = index;
    }
  }

  private static onDragEnd(array: unknown[]): void {
    if (this.currentArray == array) {
      console.log('onDragEnd');
      this.currentArray = null;
      this.currentIndex = null;
    }
  }

}
