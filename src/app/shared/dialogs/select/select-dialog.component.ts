
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';

@Component({
    selector: 'app-select-dialog',
    imports: [
    FormsModule
],
    templateUrl: 'select-dialog.component.html',
    styleUrls: ['./select-dialog.component.scss']
})
export class SelectDialogComponent<T> extends DialogContentBase<T> implements OnInit {

  public override inputs: { title: string, options: T[], nullOption?: string, defaultValue?: T, getText?: (option: T) => string, positiveButtonText?: string };

  public configuration: DialogContainerConfiguration;

  protected value: T;

  ngOnInit(): void {
    this.value = this.inputs.defaultValue;
    this.configuration = {
      title: this.inputs.title,
      buttons: [{
        text: () => 'Cancel',
        click: () => this.resolve(undefined)
      }, {
        text: () => this.inputs.positiveButtonText || 'Submit',
        disabled: () => !this.canSubmit(),
        click: () => this.submit()
      }]
    };
  }

  protected getText(option: T): string {
    return this.inputs.getText ? this.inputs.getText(option) : option as string;
  }

  protected canSubmit(): boolean {
    return this.value !== undefined;
  }

  public override submit(): void {
    if (this.canSubmit()) {
      this.resolve(this.value);
    }
  }

  public close(): void {
    this.resolve(undefined);
  }

}
