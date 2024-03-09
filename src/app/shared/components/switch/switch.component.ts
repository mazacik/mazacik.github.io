import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ScreenUtils } from '../../utils/screen.utils';
import { SwitchEvent } from './switch.event';

@Component({
  selector: 'app-switch',
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.scss']
})
export class SwitchComponent {

  @Input() tri: boolean = false;
  @Input() state: number;

  @Output() stateChange: EventEmitter<SwitchEvent> = new EventEmitter<SwitchEvent>();

  private clickX: number;
  private clickY: number;

  onMouseDown(event: MouseEvent): void {
    this.clickX = event.pageX;
    this.clickY = event.pageY;
  }

  nextState(event: SwitchEvent): void {
    if (Math.abs(event.pageX - this.clickX) < ScreenUtils.MOUSE_MOVEMENT_TOLERANCE && Math.abs(event.pageY - this.clickY) < ScreenUtils.MOUSE_MOVEMENT_TOLERANCE) {
      switch (this.state) {
        case -1:
          this.state = this.tri ? 0 : 1;
          event.state = this.tri ? 0 : 1;
          break;
        case 0:
          this.state = 1;
          event.state = 1;
          break;
        case 1:
          this.state = -1;
          event.state = -1;
          break;
      }
      this.stateChange.emit(event);
    }
  }

  previousState(event: SwitchEvent): void {
    if (Math.abs(event.pageX - this.clickX) < ScreenUtils.MOUSE_MOVEMENT_TOLERANCE && Math.abs(event.pageY - this.clickY) < ScreenUtils.MOUSE_MOVEMENT_TOLERANCE) {
      event.preventDefault();
      switch (this.state) {
        case -1:
          this.state = 1;
          event.state = 1;
          break;
        case 0:
          this.state = -1;
          event.state = -1;
          break;
        case 1:
          this.state = this.tri ? 0 : -1;
          event.state = this.tri ? 0 : -1;
          break;
      }
      this.stateChange.emit(event);
    }
  }

}
