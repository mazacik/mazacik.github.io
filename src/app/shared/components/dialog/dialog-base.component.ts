import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ComponentRef, HostBinding, HostListener, Type, ViewChild, ViewContainerRef } from '@angular/core';
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

  @HostBinding('class.bottom') get isBottom(): boolean {
    return this.position == 'bottom';
  }

  @HostBinding('@overlayFade') get isVisible(): string {
    return this.visible ? 'visible' : 'hidden';
  }

  public contentComponentType: Type<DialogContent<ResultType>>;
  public inputs: { [key: string]: unknown };
  public active: () => boolean;
  public blurOverlay: boolean;
  public position: 'center' | 'bottom';

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
      const buttons = this.inputs['buttons'] as DialogButton[];
      for (const button of buttons) {
        if (button.click) {
          const currentClick = button.click;
          button.click = () => {
            currentClick();
            this.resolve(true as ResultType);
          }
        } else {
          button.click = () => this.resolve(false as ResultType);
        }
      }

      this.contentInstance = {
        resolve: this.resolve,
        configuration: { title: null, buttons: buttons },
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

  @HostListener('window:keydown.escape', ['$event'])
  protected close(): void {
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

}
