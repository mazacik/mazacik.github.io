import { AfterViewInit, Component, ComponentRef, ElementRef, HostListener, NgZone, OnDestroy, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { DialogService } from '../../services/dialog.service';
import { KeyboardShortcutService } from '../../services/keyboard-shortcut.service';
import { ScreenUtils } from '../../utils/screen.utils';
import { DialogButton } from './dialog-button.class';
import { DialogContainerConfiguration } from './dialog-container-configuration.interface';
import { DialogContentBase } from './dialog-content-base.class';

@Component({
  selector: 'app-dialog-container',
  imports: [],
  templateUrl: './dialog-container.component.html',
  styleUrls: ['./dialog-container.component.scss'],
  host: {
    '[class.display-none]': 'hidden'
  }
})
export class DialogContainerComponent<ResultType, InputsType> implements AfterViewInit, OnDestroy {

  protected ScreenUtils = ScreenUtils;

  public top: number;
  public left: number;
  protected hidden: boolean = true;
  protected borderWarning: boolean = false;
  private dialogElement: HTMLElement;

  public contentComponentType: Type<DialogContentBase<ResultType, InputsType>>;
  public inputs: InputsType;

  @ViewChild('content', { read: ViewContainerRef }) protected containerRef: ViewContainerRef;

  public result: Promise<ResultType>;
  protected resolve: (values: ResultType) => void;
  public contentComponentInstance: DialogContentBase<ResultType, InputsType>;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private dialogService: DialogService,
    private keyboardShortcutService: KeyboardShortcutService,
    private ngZone: NgZone
  ) {
    this.result = new Promise(resolve => this.resolve = resolve);
  }

  ngAfterViewInit(): void {
    this.dialogElement = this.elementRef.nativeElement.querySelector('.dialog-container') as HTMLElement;

    const contentRef: ComponentRef<DialogContentBase<ResultType, InputsType>> = this.containerRef.createComponent(this.contentComponentType);
    this.contentComponentInstance = contentRef.instance;
    this.contentComponentInstance.inputs = this.inputs;
    this.contentComponentInstance.resolve = this.resolve;

    const waitForContent: Promise<void> = contentRef.instance.configuration?.waitForContent;
    if (waitForContent) {
      this.hidden = true;
      waitForContent.finally(() => {
        this.hidden = false;
        this.schedulePositionRestore();
      });
    } else {
      this.hidden = false;
    }

    this.keyboardShortcutService.register(this.contentComponentInstance);

    this.result.finally(() => {
      this.keyboardShortcutService.unregister(this.contentComponentInstance);
      contentRef.destroy();
    });

    contentRef.changeDetectorRef.detectChanges();
    if (!waitForContent) {
      this.schedulePositionRestore();
    }
  }

  ngOnDestroy(): void {
    this.detachDragListeners();
  }

  protected isHidden(button: DialogButton): boolean {
    return button.hidden && button.hidden();
  }

  protected isDisabled(button: DialogButton): boolean {
    return button.disabled && button.disabled();
  }

  protected getTitle(): string {
    const configuration: DialogContainerConfiguration = this.contentComponentInstance.configuration;
    if (!configuration) return '';
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
    if (ScreenUtils.isLargeScreen()) {
      if (event.buttons == 1 && event.target == header) {
        this.isMouseDown = true;
        this.mouseDownOffsetX = event.offsetX;
        this.mouseDownOffsetY = event.offsetY;
        if (!this.hasPosition()) {
          const hostRect: DOMRect = (this.dialogElement ?? this.elementRef.nativeElement.firstChild as HTMLElement).getBoundingClientRect();
          this.top = hostRect.top;
          this.left = hostRect.left;
          this.applyPosition();
          this.persistCenterFromRect(hostRect);
        }
        this.attachDragListeners();
      }
    }
  }

  private readonly onDocumentMouseMove = (event: MouseEvent): void => {
    if (ScreenUtils.isLargeScreen()) {
      event.preventDefault();
      if (!this.isMouseDown) return;
      const hostRect: DOMRect = (this.dialogElement ?? this.elementRef.nativeElement.firstChild as HTMLElement).getBoundingClientRect();

      if (this.left === undefined || this.left === null) this.left = hostRect.left;
      if (this.top === undefined || this.top === null) this.top = hostRect.top;

      const offsetX: number = event.clientX - hostRect.left;
      if (event.movementX < 0 && offsetX < this.mouseDownOffsetX) {
        this.left = this.left + event.movementX;
        if (this.left < 0) this.left = 0;
      } else if (event.movementX > 0 && offsetX > this.mouseDownOffsetX) {
        this.left = this.left + event.movementX;
        if (this.left + hostRect.width > window.innerWidth + 1) this.left = window.innerWidth - hostRect.width;
      }

      const offsetY: number = event.clientY - hostRect.top;
      if (event.movementY < 0 && offsetY < this.mouseDownOffsetY) {
        this.top = this.top + event.movementY;
        if (this.top < 0) this.top = 0;
      } else if (event.movementY > 0 && offsetY > this.mouseDownOffsetY) {
        this.top = this.top + event.movementY;
        if (this.top + hostRect.height > window.innerHeight + 2) this.top = window.innerHeight - hostRect.height + 2;
      }

      this.applyPosition();
    }
  };

  private readonly onDocumentMouseUp = (): void => {
    if (ScreenUtils.isLargeScreen()) {
      this.isMouseDown = false;
      if (this.hasPosition()) {
        const hostRect: DOMRect = (this.dialogElement ?? this.elementRef.nativeElement.firstChild as HTMLElement).getBoundingClientRect();
        this.persistCenterFromRect(hostRect);
      }
      this.detachDragListeners();
    }
  };

  private attachDragListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const doc = this.elementRef.nativeElement.ownerDocument;
      doc.addEventListener('mousemove', this.onDocumentMouseMove);
      doc.addEventListener('mouseup', this.onDocumentMouseUp);
    });
  }

  private detachDragListeners(): void {
    const doc = this.elementRef.nativeElement.ownerDocument;
    doc.removeEventListener('mousemove', this.onDocumentMouseMove);
    doc.removeEventListener('mouseup', this.onDocumentMouseUp);
  }

  private applyPosition(): void {
    if (!ScreenUtils.isLargeScreen()) return;
    if (!this.dialogElement) return;
    if (this.top !== undefined) this.dialogElement.style.top = `${this.top}px`;
    if (this.left !== undefined) this.dialogElement.style.left = `${this.left}px`;
  }

  private hasPosition(): boolean {
    return Number.isFinite(this.top) && Number.isFinite(this.left);
  }

  private schedulePositionRestore(): void {
    if (!ScreenUtils.isLargeScreen()) return;
    requestAnimationFrame(() => this.restorePositionFromStorage());
  }

  public resetPosition(): void {
    this.top = null;
    this.left = null;
    this.schedulePositionRestore();
  }

  private restorePositionFromStorage(): void {
    if (!this.dialogElement || this.hasPosition()) return;
    const hostRect: DOMRect = (this.dialogElement ?? this.elementRef.nativeElement.firstChild as HTMLElement).getBoundingClientRect();
    if (!hostRect.width || !hostRect.height) return;

    const storedCenter = this.getStoredCenter();
    if (storedCenter) {
      this.left = storedCenter.x - hostRect.width / 2;
      this.top = storedCenter.y - hostRect.height / 2;
      this.applyPosition();
      return;
    }

    this.centerInViewport(hostRect);
  }

  private getStoredCenter(): { x: number; y: number } | null {
    const centerX = this.getStoredNumber(this.getStorageKey('.centerX'));
    const centerY = this.getStoredNumber(this.getStorageKey('.centerY'));
    if (centerX === null || centerY === null) return null;
    return { x: centerX, y: centerY };
  }

  private getStorageKey(suffix: string): string {
    return `${this.contentComponentType.name}${suffix}`;
  }

  private getStoredNumber(key: string): number | null {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) return null;
    const parsed = Number.parseFloat(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private persistCenterFromRect(rect: DOMRect): void {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    window.localStorage.setItem(this.getStorageKey('.centerX'), centerX.toString());
    window.localStorage.setItem(this.getStorageKey('.centerY'), centerY.toString());
  }

  private centerInViewport(rect: DOMRect): void {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    this.left = Math.max(0, centerX - rect.width / 2);
    this.top = Math.max(0, centerY - rect.height / 2);
    this.applyPosition();
  }

  protected overlayClick(): void {
    const index: number = this.dialogService.containerComponentInstances.indexOf(this);
    for (let i = index; i < this.dialogService.containerComponentInstances.length; i++) {
      const dialog = this.dialogService.containerComponentInstances[i];
      dialog.borderWarning = true;
      setTimeout(() => dialog.borderWarning = false, 500);
    }
  }

  @HostListener('click', ['$event'])
  protected onClick(event: PointerEvent) {
    this.keyboardShortcutService.requestFocus(this.contentComponentInstance);
  }

}
