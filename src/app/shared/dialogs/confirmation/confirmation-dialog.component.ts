
import { Component, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';

@Component({
    selector: 'app-confirmation-dialog',
    imports: [],
    templateUrl: 'confirmation-dialog.component.html',
    styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent extends DialogContentBase<boolean> implements OnInit {

  public override inputs: { title: string, messages: string[], positiveButtonText?: string, negativeButtonText?: string };

  public configuration: DialogContainerConfiguration;

  ngOnInit(): void {
    this.configuration = {
      title: this.inputs.title,
      buttons: [{
        text: () => this.inputs.positiveButtonText || 'Yes',
        click: () => this.resolve(true)
      }, {
        text: () => this.inputs.negativeButtonText || 'No',
        click: () => this.resolve(false)
      }]
    };
  }

  public override submit(): void {
    this.resolve(true);
  }

  public close(): void {
    this.resolve(false);
  }

}
