import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';

@Component({
  selector: 'app-message-dialog',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: 'message-dialog.component.html',
  styleUrls: ['./message-dialog.component.scss'],
})
export class MessageDialogComponent extends DialogContentBase<void> implements OnInit {

  public override inputs: { title: string, messages: string[] };

  public configuration: DialogContainerConfiguration;

  ngOnInit(): void {
    this.configuration = {
      title: this.inputs.title,
      buttons: [{
        text: () => 'OK',
        click: () => this.resolve()
      }]
    };
  }

  @HostListener('window:keydown.enter', ['$event'])
  protected submit(): void {
    this.resolve();
  }

  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    this.resolve();
  }

}
