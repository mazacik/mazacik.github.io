import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { crossfade } from '../../constants/animations.constants';

@Component({
  selector: 'app-fuck-messenger-browser',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './fuck-messenger-browser.component.html',
  styleUrls: ['./fuck-messenger-browser.component.scss'],
  animations: [crossfade]
})
export class FuckMessengerBrowserComponent implements OnInit {

  @HostBinding('@crossfade') crossfade = true;

  protected userAgent: string = window.navigator.userAgent;

  constructor() { }

  ngOnInit(): void {

  }

}
