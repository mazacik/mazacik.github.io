import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ComponentRef, ElementRef, HostBinding, HostListener, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { DialogService } from '../../services/dialog.service';
import { ArrayUtils } from '../../utils/array.utils';
import { DialogButton } from './dialog-button.class';
import { DialogContentBase } from './dialog-content-base.class';

@Component({
  selector: 'app-dialog-container',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './dialog-container.component.html',
  styleUrls: ['./dialog-container.component.scss']
})
export class DialogContainerComponent<ResultType, InputsType> implements AfterViewInit {

  @HostBinding('class.border-warning')
  protected borderWarning: boolean = false;

  public contentComponentType: Type<DialogContentBase<ResultType, InputsType>>;
  public inputs: InputsType;

  @ViewChild('content', { read: ViewContainerRef }) protected containerRef: ViewContainerRef;

  public result: Promise<ResultType>;
  protected resolve: (values: ResultType) => void;
  public contentComponentInstance: DialogContentBase<ResultType, InputsType>;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private dialogService: DialogService
  ) {
    this.result = new Promise(resolve => this.resolve = resolve);
  }

  ngAfterViewInit(): void {
    console.log(this.contentComponentType.name); // TODO remember position using contentComponentType as identifier

    const contentRef: ComponentRef<DialogContentBase<ResultType, InputsType>> = this.containerRef.createComponent(this.contentComponentType);
    this.contentComponentInstance = contentRef.instance;
    this.contentComponentInstance.inputs = this.inputs;
    this.contentComponentInstance.resolve = this.resolve;

    this.result.finally(() => contentRef.destroy());

    contentRef.changeDetectorRef.detectChanges();
  }

  // TODO two dialogs visible at the same time, last click was on non-last, last closes. non-last should close instead.
  @HostListener('window:keydown.escape', ['$event'])
  protected closeLast(): void {
    if (ArrayUtils.isLast(this.dialogService.dialogs, this)) {
      this.close();
    }
  }

  public close(): void {
    this.contentComponentInstance?.close();
  }

  protected isHidden(button: DialogButton): boolean {
    return button.hidden && button.hidden();
  }

  protected isDisabled(button: DialogButton): boolean {
    return button.disabled && button.disabled();
  }

  protected getText(button: DialogButton): string {
    if (button.text) {
      if (typeof button.text == 'function') {
        return button.text();
      }

      return button.text;
    }
  }

  protected getIconClass(button: DialogButton): string {
    if (button.iconClass) {
      if (typeof button.iconClass == 'function') {
        return button.iconClass();
      }

      return button.iconClass;
    }
  }

  @HostBinding('style.top.px')
  private top: number;

  @HostBinding('style.left.px')
  private left: number;

  private isMouseDown: boolean = false;
  private mouseDownOffsetX: number;
  private mouseDownOffsetY: number;
  protected onHeaderMouseDown(event: MouseEvent, header: HTMLElement): void {
    if (event.buttons == 1 && event.target == header) {
      this.isMouseDown = true;
      this.mouseDownOffsetX = event.offsetX;
      this.mouseDownOffsetY = event.offsetY;
      if ((this.top || this.top === 0) && (this.left || this.left === 0)) return;
      const hostRect: DOMRect = this.elementRef.nativeElement.getBoundingClientRect();
      this.top = hostRect.top;
      this.left = hostRect.left;
    }
  }

  @HostListener('document:mouseup', ['$event'])
  protected onHeaderMouseUp(): void {
    this.isMouseDown = false;
  }

  @HostListener('document:mousemove', ['$event'])
  protected onHeaderMouseMove(event: MouseEvent): void {
    event.preventDefault();
    if (this.isMouseDown) {
      const hostRect: DOMRect = this.elementRef.nativeElement.getBoundingClientRect();

      const offsetX: number = event.clientX - hostRect.left;
      if (event.movementX < 0 && offsetX < this.mouseDownOffsetX) {
        this.left = this.left + event.movementX;
        if (this.left < 0) this.left = 0;
      } else if (event.movementX > 0 && offsetX > this.mouseDownOffsetX) {
        this.left = this.left + event.movementX;
        if (this.left + hostRect.width > window.innerWidth + 1) this.left = window.innerWidth - hostRect.width + 1;
      }

      const offsetY: number = event.clientY - hostRect.top;
      if (event.movementY < 0 && offsetY < this.mouseDownOffsetY) {
        this.top = this.top + event.movementY;
        if (this.top < 0) this.top = 0;
      } else if (event.movementY > 0 && offsetY > this.mouseDownOffsetY) {
        this.top = this.top + event.movementY;
        if (this.top + hostRect.height > window.innerHeight + 2) this.top = window.innerHeight - hostRect.height + 2;
      }
    }
  }

  protected overlayClick(): void {
    const index: number = this.dialogService.dialogs.findIndex(dialog => dialog == this);
    for (let i = index; i < this.dialogService.dialogs.length; i++) {
      const dialog = this.dialogService.dialogs[i];
      dialog.borderWarning = true;
      setTimeout(() => dialog.borderWarning = false, 500);
    }
  }

}
