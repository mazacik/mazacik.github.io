
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { ArrayUtils } from '../../utils/array.utils';
import { StringUtils } from '../../utils/string.utils';
import { CreateDirective } from '../../directives/create.directive';

@Component({
    selector: 'app-multi-input-dialog',
    imports: [
    FormsModule,
    CreateDirective
],
    templateUrl: './multi-input-dialog.component.html',
    styleUrls: ['./multi-input-dialog.component.scss']
})
export class MultiInputDialogComponent extends DialogContentBase<string[]> implements OnInit {

  public override inputs: { title: string, placeholder?: string, defaultValues?: string[], positiveButtonText?: string };

  public configuration: DialogContainerConfiguration;

  protected values: string[] = [];

  protected inputValue: string = '';

  ngOnInit(): void {
    this.values = [...this.inputs.defaultValues];
    this.configuration = {
      title: this.inputs.title,
      buttons: [{
        id: 'cancel',
        text: () => 'Cancel',
        click: () => this.resolve(undefined)
      }, {
        id: 'positive',
        text: () => this.inputs.positiveButtonText || 'Submit',
        disabled: () => !this.canSubmit(),
        click: () => this.submit()
      }]
    };
  }

  protected remove(value: string): void {
    ArrayUtils.remove(this.values, value);
  }

  protected onInputKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (StringUtils.isEmpty(this.inputValue)) {
        this.resolve(this.values);
      } else {
        this.values.push(this.inputValue);
        this.inputValue = '';
      }
    }
  }

  protected canSubmit(): boolean {
    return true;
  }

  public override submit(): void {
    if (this.canSubmit()) {
      if (!StringUtils.isEmpty(this.inputValue)) {
        this.values.push(this.inputValue);
      }

      this.resolve(this.values);
    }
  }

  public close(): void {
    this.resolve(undefined);
  }

}
