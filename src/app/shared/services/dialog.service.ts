import { ApplicationRef, ComponentRef, EnvironmentInjector, Injectable, Type, createComponent } from '@angular/core';
import { DialogContainerComponent } from '../components/dialog/dialog-container.component';
import { DialogContentBase } from '../components/dialog/dialog-content-base.class';
import { ConfirmationDialogComponent } from '../dialogs/confirmation/confirmation-dialog.component';
import { InputDialogComponent } from '../dialogs/input/input-dialog.component';
import { MessageDialogComponent } from '../dialogs/message/message-dialog.component';
import { ArrayUtils } from '../utils/array.utils';

@Injectable({
  providedIn: 'root',
})
export class DialogService {

  public dialogs: DialogContainerComponent<any, any>[] = [];

  constructor(
    private applicationRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {
    document.addEventListener('keydown', event => {
      if (this.dialogs.length > 0) {
        if (event.key == 'Enter') {
          event.stopImmediatePropagation();
          ArrayUtils.getLast(this.dialogs)?.contentComponentInstance.submit();
        } else if (event.key == 'Escape') {
          event.stopImmediatePropagation();
          ArrayUtils.getLast(this.dialogs)?.contentComponentInstance.close();
        }
      }
    });
  }

  public createMessage(title: string, messages: string[]): Promise<void> {
    return this.create(MessageDialogComponent, { title, messages });
  }

  public createConfirmation(title: string, messages: string[], positiveButtonText: string, negativeButtonText: string): Promise<boolean> {
    return this.create(ConfirmationDialogComponent, { title, messages, positiveButtonText, negativeButtonText });
  }

  public createInput(title: string, placeholder: string, defaultValue: string, positiveButtonText: string): Promise<string> {
    return this.create(InputDialogComponent, { title, placeholder, defaultValue, positiveButtonText });
  }

  public create<ResultType, ContentComponent extends DialogContentBase<ResultType, NoInputsType>>(component: Type<ContentComponent>): Promise<ResultType>;
  public create<ResultType, InputsType, ContentComponent extends DialogContentBase<ResultType, InputsType>>(contentComponentType: Type<ContentComponent>, inputs: RequireInputsType<ContentComponent>): Promise<ResultType>;
  public create<ResultType, InputsType, ContentComponent extends DialogContentBase<ResultType, InputsType>>(contentComponentType: Type<ContentComponent>, inputs?: any): Promise<ResultType> {
    const existingContainerComponentInstance = ArrayUtils.getLast(this.dialogs.filter(dialog => dialog.contentComponentType == contentComponentType));
    if (existingContainerComponentInstance && !existingContainerComponentInstance.contentComponentInstance.configuration.allowMultiple) {
      return;
    }

    const containerComponentRef: ComponentRef<DialogContainerComponent<ResultType, InputsType>> = createComponent(DialogContainerComponent<ResultType, InputsType>, { environmentInjector: this.injector });
    const containerComponentInstance: DialogContainerComponent<ResultType, InputsType> = containerComponentRef.instance;

    containerComponentInstance.contentComponentType = contentComponentType;
    containerComponentInstance.inputs = inputs;
    containerComponentInstance.result.finally(() => {
      ArrayUtils.remove(this.dialogs, this.dialogs.find(dialog => dialog == containerComponentInstance));
      this.applicationRef.detachView(containerComponentRef.hostView);
      containerComponentRef.destroy();
    });

    if (existingContainerComponentInstance) {
      containerComponentInstance.top = existingContainerComponentInstance.top + 10;
      containerComponentInstance.left = existingContainerComponentInstance.left + 10;
    }

    this.dialogs.push(containerComponentInstance);
    this.applicationRef.attachView(containerComponentRef.hostView);
    document.body.firstElementChild.appendChild(containerComponentRef.location.nativeElement);

    containerComponentRef.changeDetectorRef.detectChanges();
    return containerComponentInstance.result;
  }

}

type NoInputsType = { _noInputs?: true };
type RequireInputsType<T extends DialogContentBase<any, any>> = [T] extends [DialogContentBase<any, NoInputsType>] ? never : T extends DialogContentBase<any, infer I> ? I : never;
