import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: 'confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
})
export class ConfirmationDialogComponent extends DialogContent<boolean> implements OnInit {

  @Input() title: string;
  @Input() messages: string[];
  @Input() positiveButtonText: string;
  @Input() negativeButtonText: string;

  public configuration: DialogConfiguration;

  ngOnInit(): void {
    this.configuration = {
      title: this.title,
      buttons: [{
        text: () => this.positiveButtonText,
        click: () => this.resolve(true)
      }, {
        text: () => this.negativeButtonText,
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
