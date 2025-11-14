import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { ArrayUtils } from '../../utils/array.utils';

@Component({
    selector: 'app-multi-select-dialog',
    imports: [
        CommonModule,
        FormsModule
    ],
    templateUrl: 'multi-select-dialog.component.html',
    styleUrls: ['./multi-select-dialog.component.scss']
})
export class MultiSelectDialogComponent<T> extends DialogContentBase<T[]> implements OnInit {

  public override inputs: {
    title: string,
    positiveButtonText?: string | (() => string),
    options: T[],
    getText?: (option: T) => string,
    defaultSelection?: T[],
    disableFn?: (option: T, selection: T[]) => boolean,
    onSelectionChange?: (selection: T[], change: T) => void
  };

  public configuration: DialogContainerConfiguration;

  protected query: string = '';
  protected selection: T[] = [];

  ngOnInit(): void {
    this.selection = this.inputs.defaultSelection ? [...this.inputs.defaultSelection] : [];
    this.configuration = {
      title: this.inputs.title,
      buttons: [{
        text: 'Cancel',
        click: () => this.resolve(undefined)
      }, {
        text: () => {
          let text: string;
          if (this.inputs.positiveButtonText) {
            if (typeof this.inputs.positiveButtonText == 'string') {
              text = this.inputs.positiveButtonText;
            } else {
              text = this.inputs.positiveButtonText();
            }
          } else {
            text = 'Submit';
          }
          return text + ' (' + this.selection.length + ')';
        },
        disabled: () => !this.canSubmit(),
        click: () => this.submit()
      }]
    };
  }

  protected isAvailable(option: T): boolean {
    // if (this.selection.includes(option)) return false; // TODO maybe also leave option visible in bottom container?
    return this.getText(option).toLocaleLowerCase().includes(this.query.toLocaleLowerCase());
  }

  protected getText(option: T): string {
    return this.inputs.getText ? this.inputs.getText(option) : option as string;
  }

  protected toggle(option: T): void {
    ArrayUtils.toggle(this.selection, option, true);
    this.inputs.onSelectionChange && this.inputs.onSelectionChange(this.selection, option);
  }

  protected canSubmit(): boolean {
    return true;
  }

  public override submit(): void {
    if (this.canSubmit()) {
      this.resolve(this.selection);
    }
  }

  public close(): void {
    this.resolve(undefined);
  }

}
