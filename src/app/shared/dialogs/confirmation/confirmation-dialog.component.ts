import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: 'confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
})
export class ConfirmationDialogComponent extends DialogContentBase<boolean> implements OnInit {

  public override inputs: { title: string, messages: string[], positiveButtonText: string, negativeButtonText: string };

  public configuration: DialogContainerConfiguration;

  ngOnInit(): void {
    this.configuration = {
      title: this.inputs.title,
      buttons: [{
        text: () => this.inputs.positiveButtonText,
        click: () => this.resolve(true)
      }, {
        text: () => this.inputs.negativeButtonText,
        click: () => this.resolve(false)
      }, {
        text: () => 'Cancel',
        click: () => this.resolve(false)
      }]
    };
  }

  @HostListener('window:keydown.enter', ['$event'])
  protected submit(): void {
    this.resolve(true);
  }

  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    this.resolve(false);
  }

}
