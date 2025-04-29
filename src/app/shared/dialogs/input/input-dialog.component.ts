import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { StringUtils } from '../../utils/string.utils';

@Component({
  selector: 'app-input-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: 'input-dialog.component.html',
  styleUrls: ['./input-dialog.component.scss'],
})
export class InputDialogComponent extends DialogContentBase<string> implements OnInit {

  public override inputs: { title: string, placeholder: string, defaultValue: string, positiveButtonText: string };

  public configuration: DialogContainerConfiguration;

  protected value: string;

  ngOnInit(): void {
    this.value = this.inputs.defaultValue;
    this.configuration = {
      title: this.inputs.title,
      buttons: [{
        text: () => 'Cancel',
        click: () => this.resolve(null)
      }, {
        text: () => this.inputs.positiveButtonText,
        disabled: () => !this.canSubmit(),
        click: () => {
          if (this.canSubmit()) {
            this.resolve(this.value);
          }
        }
      }]
    };
  }

  protected canSubmit(): boolean {
    return !StringUtils.isEmpty(this.value);
  }

  public override submit(): void {
    if (this.canSubmit()) {
      this.resolve(this.value);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
