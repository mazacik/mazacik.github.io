import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ScreenUtils } from '../../utils/screen.utils';
import { SwitchEvent } from './switch.event';

@Component({
  selector: 'app-switch',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.scss']
})
export class SwitchComponent implements OnInit {

  @Input() tri: boolean = false;
  @Input() state: number;

  @Output() stateChange: EventEmitter<SwitchEvent> = new EventEmitter<SwitchEvent>();

  private clickX: number;
  private clickY: number;

  ngOnInit(): void {
    if (!this.state) {
      this.state = this.tri ? 0 : -1;
    }
  }

  onMouseDown(event: MouseEvent): void {
    this.clickX = event.pageX;
    this.clickY = event.pageY;
  }

  nextState(event: SwitchEvent): void {
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

  previousState(event: SwitchEvent): void {
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
