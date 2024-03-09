import { animate, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, Component, ComponentRef, HostBinding, HostListener, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { DialogContent } from './dialog-content.class';

@Component({
  selector: 'app-dialog-base',
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

  @ViewChild('content', { read: ViewContainerRef }) protected containerRef: ViewContainerRef;

  public result: Promise<ResultType>;
  protected resolve: (values: ResultType) => void;
  protected contentInstance: DialogContent<ResultType>;
  protected visible: boolean = true;

  constructor() {
    this.result = new Promise(resolve => this.resolve = resolve);
  }

  ngAfterViewInit(): void {
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
  }

  @HostListener('window:keydown.escape', ['$event'])
  protected close(): void {
    this.contentInstance.close();
  }

}
