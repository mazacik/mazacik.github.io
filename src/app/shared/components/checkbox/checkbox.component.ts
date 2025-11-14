import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-checkbox',
    imports: [
        CommonModule
    ],
    templateUrl: './checkbox.component.html',
    styleUrls: ['./checkbox.component.scss']
})
export class CheckboxComponent {

  @Input() public value: boolean;
  @Output() public valueChange: EventEmitter<boolean> = new EventEmitter();

}
