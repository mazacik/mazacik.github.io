import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TippyDirective } from '@ngneat/helipopper';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { crossfade } from '../../constants/animations.constants';

@Component({
  selector: 'app-fuck-messenger-browser',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TippyDirective,
    VariableDirective,
    CreateDirective
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
