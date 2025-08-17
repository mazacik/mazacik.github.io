import { ApplicationRef, ComponentRef, EnvironmentInjector, Injectable, Type, createComponent } from '@angular/core';
import { DialogContainerComponent } from '../components/dialog/dialog-container.component';
import { DialogContentBase } from '../components/dialog/dialog-content-base.class';
import { ConfirmationDialogComponent } from '../dialogs/confirmation/confirmation-dialog.component';
import { InputDialogComponent } from '../dialogs/input/input-dialog.component';
import { MessageDialogComponent } from '../dialogs/message/message-dialog.component';
import { MultiSelectDialogComponent } from '../dialogs/multi-select/multi-select-dialog.component';
import { SelectDialogComponent } from '../dialogs/select/select-dialog.component';
import { ArrayUtils } from '../utils/array.utils';
import { MultiInputDialogComponent } from '../dialogs/multi-input/multi-input-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {

  public containerComponentInstances: DialogContainerComponent<any, any>[] = [];

  constructor(
    private applicationRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) { }

  public createMessage(inputs: typeof MessageDialogComponent.prototype.inputs): Promise<void> {
    return this.create(MessageDialogComponent, inputs);
  }

  public createConfirmation(inputs: typeof ConfirmationDialogComponent.prototype.inputs): Promise<boolean> {
    return this.create(ConfirmationDialogComponent, inputs);
  }

  public createInput(inputs: typeof InputDialogComponent.prototype.inputs): Promise<string> {
    return this.create(InputDialogComponent, inputs);
  }

  public createMultiInput(inputs: typeof MultiInputDialogComponent.prototype.inputs): Promise<string[]> {
    return this.create(MultiInputDialogComponent, inputs);
  }

  public createSelect<T>(inputs: typeof SelectDialogComponent.prototype.inputs): Promise<T> {
    return this.create(SelectDialogComponent, inputs);
  }

  public createMultiSelect<T>(inputs: typeof MultiSelectDialogComponent.prototype.inputs): Promise<T[]> {
    return this.create(MultiSelectDialogComponent, inputs);
  }

  public create<ResultType, ContentComponent extends DialogContentBase<ResultType, NoInputsType>>(component: Type<ContentComponent>): Promise<ResultType>;
  public create<ResultType, InputsType, ContentComponent extends DialogContentBase<ResultType, InputsType>>(contentComponentType: Type<ContentComponent>, inputs: RequireInputsType<ContentComponent>): Promise<ResultType>;
  public create<ResultType, InputsType, ContentComponent extends DialogContentBase<ResultType, InputsType>>(contentComponentType: Type<ContentComponent>, inputs?: any): Promise<ResultType> {
    const existingContainerComponentInstance = ArrayUtils.getLast(this.containerComponentInstances.filter(dialog => dialog.contentComponentType == contentComponentType));
    if (existingContainerComponentInstance && !existingContainerComponentInstance.contentComponentInstance.configuration.allowMultiple) {
      return;
    }

    const containerComponentRef: ComponentRef<DialogContainerComponent<ResultType, InputsType>> = createComponent(DialogContainerComponent<ResultType, InputsType>, { environmentInjector: this.injector });
    const containerComponentInstance: DialogContainerComponent<ResultType, InputsType> = containerComponentRef.instance;

    containerComponentInstance.contentComponentType = contentComponentType;
    containerComponentInstance.inputs = inputs;
    containerComponentInstance.result.finally(() => {
      ArrayUtils.remove(this.containerComponentInstances, containerComponentInstance);
      this.applicationRef.detachView(containerComponentRef.hostView);
      containerComponentRef.destroy();
    });

    if (existingContainerComponentInstance) {
      containerComponentInstance.top = existingContainerComponentInstance.top + 10;
      containerComponentInstance.left = existingContainerComponentInstance.left + 10;
    }

    this.containerComponentInstances.push(containerComponentInstance);
    this.applicationRef.attachView(containerComponentRef.hostView);
    document.body.firstElementChild.appendChild(containerComponentRef.location.nativeElement);

    containerComponentRef.changeDetectorRef.detectChanges();
    return containerComponentInstance.result;
  }

}

type NoInputsType = { _noInputs?: true };
type RequireInputsType<T extends DialogContentBase<any, any>> = [T] extends [DialogContentBase<any, NoInputsType>] ? never : T extends DialogContentBase<any, infer I> ? I : never;
