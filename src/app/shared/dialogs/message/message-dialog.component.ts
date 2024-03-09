import { Component, HostListener, Input, OnInit } from '@angular/core';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';

@Component({
  selector: 'app-message-dialog',
  templateUrl: 'message-dialog.component.html',
  styleUrls: ['./message-dialog.component.scss'],
})
export class MessageDialogComponent extends DialogContent<void> implements OnInit {

  @Input() title: string;
  @Input() messages: string[];

  public configuration: DialogConfiguration;

  ngOnInit(): void {
    this.configuration = {
      title: this.title,
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
