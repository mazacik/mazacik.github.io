
import { Component, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';

@Component({
    selector: 'app-message-dialog',
    imports: [],
    templateUrl: 'message-dialog.component.html',
    styleUrls: ['./message-dialog.component.scss']
})
export class MessageDialogComponent extends DialogContentBase<void> implements OnInit {

  public override inputs: { title: string, messages: string[] };

  public configuration: DialogContainerConfiguration;

  ngOnInit(): void {
    this.configuration = {
      title: this.inputs.title,
      headerButtons: [{
        iconClass: 'fa-solid fa-times',
        click: () => this.close()
      }],
      footerButtons: [{
        text: () => 'OK',
        click: () => this.resolve()
      }]
    };
  }

  public close(): void {
    this.resolve();
  }

}
