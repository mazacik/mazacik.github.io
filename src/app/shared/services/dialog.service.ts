import { ApplicationRef, ComponentRef, EnvironmentInjector, Injectable, Type, createComponent } from '@angular/core';
import { DialogBaseComponent } from '../components/dialog/dialog-base.component';
import { DialogContent } from '../components/dialog/dialog-content.class';
import { ConfirmationDialogComponent } from '../dialogs/confirmation/confirmation-dialog.component';
import { MessageDialogComponent } from '../dialogs/message/message-dialog.component';
import { ArrayUtils } from '../utils/array.utils';

@Injectable({
  providedIn: 'root',
})
export class DialogService {

  private stack: DialogBaseComponent<any>[] = [];

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) { }

  public createMessage(title: string, messages: string[]): Promise<void> {
    return this.create(MessageDialogComponent, { title, messages });
  }

  public createConfirmation(title: string, messages: string[], positiveButtonText: string, negativeButtonText: string): Promise<boolean> {
    return this.create(ConfirmationDialogComponent, { title, messages, positiveButtonText, negativeButtonText });
  }

  public create<ResultType>(contentComponentType: Type<DialogContent<ResultType>>, inputs?: { [key: string]: unknown }): Promise<ResultType> {
    const baseRef: ComponentRef<DialogBaseComponent<ResultType>> = createComponent(DialogBaseComponent<ResultType>, { environmentInjector: this.injector });
    const baseInstance: DialogBaseComponent<ResultType> = baseRef.instance;

    baseInstance.contentComponentType = contentComponentType;
    baseInstance.inputs = inputs;
    baseInstance.active = () => ArrayUtils.isLast(this.stack, baseInstance);

    baseInstance.result.then(() => {
      ArrayUtils.remove(this.stack, baseInstance);
      setTimeout(() => {
        this.appRef.detachView(baseRef.hostView);
        baseRef.destroy();
      }, 250);
    });

    this.stack.push(baseInstance);
    this.appRef.attachView(baseRef.hostView);
    document.body.firstElementChild.appendChild(baseRef.location.nativeElement);

    baseRef.changeDetectorRef.detectChanges();
    return baseInstance.result;
  }

  public getCount(): number {
    return this.stack.length;
  }

}
