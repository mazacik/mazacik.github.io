import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
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
export class InputDialogComponent extends DialogContent<string> implements OnInit {

  @Input() title: string;
  @Input() placeholder: string;
  @Input() defaultValue: string;
  @Input() positiveButtonText: string;

  public configuration: DialogConfiguration;

  protected value: string;

  ngOnInit(): void {
    this.value = this.defaultValue;
    this.configuration = {
      title: this.title,
      buttons: [{
        text: () => 'Cancel',
        click: () => this.resolve(null)
      }, {
        text: () => this.positiveButtonText,
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

  @HostListener('window:keydown.enter', ['$event'])
  protected submit(): void {
    if (this.canSubmit()) {
      this.resolve(this.value);
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    this.resolve(null);
  }

}
