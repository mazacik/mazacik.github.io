import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { fade, skip } from '../shared/consntants/animations.constants';
import { LargeScreenDirective } from '../shared/directives/largescreen.directive';
import { SmallScreenDirective } from '../shared/directives/smallscreen.directive';
import { FirebaseAuthService } from '../shared/services/firebase-auth.service';
import { events } from './events/events';
import { Event } from './models/event.interface';
import { EventManagerService } from './services/event-manager.service';

@Component({
  selector: 'app-event-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LargeScreenDirective,
    SmallScreenDirective
  ],
  templateUrl: './event-manager.component.html',
  styleUrls: ['./event-manager.component.scss'],
  animations: [fade, skip]
})
export class EventManagerComponent implements OnInit {

  @HostBinding('@skip') skip = true;

  protected event: Event;
  protected sidebarVisible: boolean = window.innerWidth <= 1000;

  protected menus = [{
    text: 'Prihláška',
    urlTree: ['prihlaska'],
    active: false
  }, {
    text: 'Hlasovanie',
    urlTree: ['hlasovanie'],
    active: true
  }, {
    text: 'Výsledky',
    urlTree: ['hlasovanie', 'vysledky'],
    active: true
  }];

  constructor(
    private route: ActivatedRoute,
    protected authService: FirebaseAuthService,
    protected eventManagerService: EventManagerService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.event = JSON.parse(JSON.stringify(events.find(event => event.id == params['id'])));
      this.eventManagerService.event = this.event;
    });
  }

  protected getActiveMenus(): any {
    return this.menus.filter(menu => menu.active);
  }

}
