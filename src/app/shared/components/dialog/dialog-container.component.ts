import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ComponentRef, ElementRef, HostBinding, HostListener, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { DialogService } from '../../services/dialog.service';
import { KeyboardShortcutService } from '../../services/keyboard-shortcut.service';
import { ScreenUtils } from '../../utils/screen.utils';
import { DialogButton } from './dialog-button.class';
import { DialogContentBase } from './dialog-content-base.class';
import { DialogContainerConfiguration } from './dialog-container-configuration.interface';

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

  @HostBinding('style.top.px')
  public top: number;

  @HostBinding('style.left.px')
  public left: number;

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
    private dialogService: DialogService,
    private keyboardShortcutService: KeyboardShortcutService
  ) {
    this.result = new Promise(resolve => this.resolve = resolve);
  }

  ngAfterViewInit(): void {
    if (ScreenUtils.isLargeScreen()) {
      if (!this.top) {
        this.top = Number.parseInt(window.localStorage.getItem(this.contentComponentType.name + '.top'));
      }
      if (!this.left) {
        this.left = Number.parseInt(window.localStorage.getItem(this.contentComponentType.name + '.left'));
      }
    }

    const contentRef: ComponentRef<DialogContentBase<ResultType, InputsType>> = this.containerRef.createComponent(this.contentComponentType);
    this.contentComponentInstance = contentRef.instance;
    this.contentComponentInstance.inputs = this.inputs;
    this.contentComponentInstance.resolve = this.resolve;

    this.keyboardShortcutService.register(this.contentComponentInstance);

    this.result.finally(() => {
      this.keyboardShortcutService.unregister(this.contentComponentInstance);
      contentRef.destroy();
    });

    contentRef.changeDetectorRef.detectChanges();
  }

  protected isHidden(button: DialogButton): boolean {
    return button.hidden && button.hidden();
  }

  protected isDisabled(button: DialogButton): boolean {
    return button.disabled && button.disabled();
  }

  protected getTitle(): string {
    const configuration: DialogContainerConfiguration = this.contentComponentInstance.configuration;
    return typeof configuration.title == 'function' ? configuration.title() : configuration.title;
  }

  protected getButtonText(button: DialogButton): string {
    return typeof button.text == 'function' ? button.text() : button.text;
  }

  protected getButtonIconClass(button: DialogButton): string {
    return typeof button.iconClass == 'function' ? button.iconClass() : button.iconClass;
  }

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
      localStorage.setItem(this.contentComponentType.name + '.top', this.top.toString());
      localStorage.setItem(this.contentComponentType.name + '.left', this.left.toString());
    }
  }

  @HostListener('document:mouseup', ['$event'])
  protected onHeaderMouseUp(): void {
    this.isMouseDown = false;
    if (this.top !== undefined) localStorage.setItem(this.contentComponentType.name + '.top', this.top.toString());
    if (this.left !== undefined) localStorage.setItem(this.contentComponentType.name + '.left', this.left.toString());
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
    const index: number = this.dialogService.containerComponentInstances.indexOf(this);
    for (let i = index; i < this.dialogService.containerComponentInstances.length; i++) {
      const dialog = this.dialogService.containerComponentInstances[i];
      dialog.borderWarning = true;
      setTimeout(() => dialog.borderWarning = false, 500);
    }
  }

  @HostListener('window:resize', ['$event'])
  protected onScreenResize(event: Event) {
    if (!ScreenUtils.isLargeScreen()) {
      this.top = null;
      this.left = null;
    }
  }

  @HostListener('click', ['$event'])
  protected onClick(event: KeyboardEvent) {
    this.keyboardShortcutService.requestFocus(this.contentComponentInstance);
  }

}
