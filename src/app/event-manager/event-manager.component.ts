import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { fade } from '../shared/consntants/animations.constants';
import { LargeScreenDirective } from '../shared/directives/largescreen.directive';
import { SmallScreenDirective } from '../shared/directives/smallscreen.directive';
import { FirebaseAuthService } from '../shared/services/firebase-auth.service';
import { events } from './events/events';
import { EventManagerService } from './services/event-manager.service';

@Component({
  selector: 'app-event-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterOutlet,
    LargeScreenDirective,
    SmallScreenDirective
  ],
  templateUrl: './event-manager.component.html',
  styleUrls: ['./event-manager.component.scss'],
  animations: [fade]
})
export class EventManagerComponent implements OnInit {

  protected sidebarVisible: boolean = false;

  constructor(
    private route: ActivatedRoute,
    protected authService: FirebaseAuthService,
    protected eventManagerService: EventManagerService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => this.eventManagerService.event = JSON.parse(JSON.stringify(events.find(event => event.id == params['id']))));
  }

}
