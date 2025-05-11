import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-range',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss']
})
export class RangeComponent {

  // component emits wrong value if not 0-100 (emits percentage instead of actual value)

  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() minValue: number = 0;
  @Input() maxValue: number = 100;

  @Output() minValueChange = new EventEmitter<number>();
  @Output() maxValueChange = new EventEmitter<number>();


  dragging: 'min' | 'max' | null = null;
  sliderWidth = 0;
  sliderLeft = 0;

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.dragging) {
      const relativeX = event.clientX - this.sliderLeft;
      const percent = this.snapToStep(this.clamp((relativeX / this.sliderWidth) * 100));

      if (this.dragging == 'min') {
        this.minValue = Math.min(percent, this.maxValue);
        this.minValueChange.emit(this.minValue);
      } else {
        this.maxValue = Math.max(percent, this.minValue);
        this.maxValueChange.emit(this.maxValue);
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp() {
    if (this.dragging) {
      this.dragging = null;
    }
  }

  onMouseDown(event: MouseEvent) {
    if (event.button == 0) {
      const slider = (event.target as HTMLElement).closest('.slider') as HTMLElement;
      this.sliderWidth = slider.offsetWidth;
      this.sliderLeft = slider.getBoundingClientRect().left;

      const relativeX = event.clientX - this.sliderLeft;
      const exact = (relativeX / this.sliderWidth) * 100;
      const percent = this.snapToStep(this.clamp(exact));

      const distanceToMin = Math.abs(percent - this.minValue);
      const distanceToMax = Math.abs(percent - this.maxValue);

      if (distanceToMin == distanceToMax) {
        if (exact < this.minValue) {
          this.dragging = 'min';
          this.minValue = Math.min(percent, this.maxValue);
          this.minValueChange.emit(this.minValue);
        } else {
          this.dragging = 'max';
          this.maxValue = Math.max(percent, this.minValue);
          this.maxValueChange.emit(this.maxValue);
        }
      } else if (distanceToMin < distanceToMax) {
        this.dragging = 'min';
        this.minValue = Math.min(percent, this.maxValue);
        this.minValueChange.emit(this.minValue);
      } else {
        this.dragging = 'max';
        this.maxValue = Math.max(percent, this.minValue);
        this.maxValueChange.emit(this.maxValue);
      }
    }
  }

  private clamp(value: number) {
    return Math.max(0, Math.min(100, value));
  }

  // TODO variable instead of method
  protected percentToValue(percent: number): number {
    return Math.round(this.min + ((this.max - this.min) * percent) / 100);
  }

  private stepPercent(): number {
    return 100 / (this.max - this.min);
  }

  private snapToStep(percent: number): number {
    const steps = Math.round(percent / this.stepPercent());
    return steps * this.stepPercent();
  }

}
