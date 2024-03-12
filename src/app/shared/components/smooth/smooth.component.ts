import { animate, style, transition, trigger } from "@angular/animations";
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-smooth',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './smooth.component.html',
  styleUrls: ['./smooth.component.scss'],
  animations: [
    trigger('grow', [
      transition('* => *', [
        style({ width: '{{startWidth}}px', height: '{{startHeight}}px' }),
        animate('3000ms ease', style({ width: '*', height: '*' })),
      ], { params: { startWidth: 0, startHeight: 0 } })
    ])
  ]
})
export class SmoothComponent implements OnChanges {

  @Input() trigger: any;

  private startWidth: number;
  private startHeight: number;

  constructor(
    private element: ElementRef
  ) { }

  @HostBinding('@grow') get grow() {
    return { value: this.trigger, params: { startWidth: this.startWidth, startHeight: this.startHeight } };
  }

  ngOnChanges() {
    this.startWidth = this.element.nativeElement.clientWidth;
    this.startHeight = this.element.nativeElement.clientHeight;

    console.log(this.startWidth);
  }
}
