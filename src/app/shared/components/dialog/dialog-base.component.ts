import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ComponentRef, ElementRef, HostBinding, HostListener, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { DialogButton } from './dialog-button.class';
import { DialogContent } from './dialog-content.class';

@Component({
  selector: 'app-dialog-base',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './dialog-base.component.html',
  styleUrls: ['./dialog-base.component.scss'],
  animations: [
    trigger('overlayFade', [
      transition('* => visible', [
        style({ opacity: 0 }),
        animate('250ms ease', style({ opacity: 1 }))
      ]),
      transition('* => hidden', [
        style({ opacity: 1 }),
        animate('250ms ease', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class DialogBaseComponent<ResultType> implements AfterViewInit {

  @HostBinding('class.active') get isActive(): boolean {
    return this.active();
  }

  @HostBinding('@overlayFade') get isVisible(): string {
    return this.visible ? 'visible' : 'hidden';
  }

  public contentComponentType: Type<DialogContent<ResultType>>;
  public inputs: { [key: string]: unknown };
  public active: () => boolean;

  @ViewChild('header') protected header: ElementRef<HTMLElement>;
  @ViewChild('content', { read: ViewContainerRef }) protected containerRef: ViewContainerRef;

  public result: Promise<ResultType>;
  protected resolve: (values: ResultType) => void;
  protected contentInstance: DialogContent<ResultType>;
  protected visible: boolean = true;

  constructor() {
    this.result = new Promise(resolve => this.resolve = resolve);
  }

  ngAfterViewInit(): void {
    if (this.contentComponentType) {
      console.log(this.contentComponentType.name);

      const contentRef: ComponentRef<DialogContent<ResultType>> = this.containerRef.createComponent(this.contentComponentType);
      this.contentInstance = contentRef.instance;
      this.contentInstance.resolve = this.resolve;

      this.result.then(() => {
        this.visible = false;
        setTimeout(() => contentRef.destroy(), 250); // TODO 250 => constant
      });

      if (this.inputs) {
        for (const [inputName, inputValue] of Object.entries(this.inputs)) {
          contentRef.setInput(inputName, inputValue);
        }
      }

      this.visible = true;
      contentRef.changeDetectorRef.detectChanges();
    } else {
      const buttons: DialogButton[] = this.inputs['buttons'] as DialogButton[];
      for (const button of buttons) {
        button.click = () => this.resolve(button.resolveValue as ResultType);
      }

      this.contentInstance = {
        resolve: this.resolve,
        configuration: { title: null, buttons: buttons, hideTopRightCloseButton: true },
        close: () => this.resolve(false as ResultType)
      };

      this.result.then(() => {
        this.visible = false;
        for (const button of buttons) {
          if (button.text && typeof button.text == 'function') {
            button.text = button.text();
          }
        }
      });

      this.visible = true;
    }
  }

  public close(): void {
    this.contentInstance?.close();
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
  protected onHeaderMouseDown(event: MouseEvent): void {
    if (event.buttons == 1) {
      this.isMouseDown = true;
      this.mouseDownOffsetX = event.offsetX;
      this.mouseDownOffsetY = event.offsetY;
      if ((this.top || this.top === 0) && (this.left || this.left === 0)) return;
      const header: DOMRect = this.header.nativeElement.getBoundingClientRect();
      this.top = header.top;
      this.left = header.left;
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
      const header: DOMRect = this.header.nativeElement.getBoundingClientRect();

      const headerOffsetX: number = event.clientX - header.left;
      if (event.movementX < 0 && headerOffsetX < this.mouseDownOffsetX) {
        this.left = this.left + event.movementX;
        if (this.left < 0) this.left = 0;
      } else if (event.movementX > 0 && headerOffsetX > this.mouseDownOffsetX) {
        this.left = this.left + event.movementX;
        if (this.left + header.width > window.innerWidth - 1) this.left = window.innerWidth - header.width - 1;
      }

      const headerOffsetY: number = event.clientY - header.top;
      if (event.movementY < 0 && headerOffsetY < this.mouseDownOffsetY) {
        this.top = this.top + event.movementY;
        if (this.top < 0) this.top = 0;
      } else if (event.movementY > 0 && headerOffsetY > this.mouseDownOffsetY) {
        this.top = this.top + event.movementY;
        if (this.top + header.height > window.innerHeight) this.top = window.innerHeight - header.height;
      }
    }
  }

}
