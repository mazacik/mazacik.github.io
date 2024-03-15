import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { crossfade, drawer, enter, fade, skip } from 'src/app/shared/consntants/animations.constants';
import { events } from '../events/events';
import { Event } from '../models/event.interface';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.scss'],
  animations: [crossfade, enter, drawer, fade, skip]
})
export class RulesComponent implements OnInit {

  @HostBinding('@crossfade') crossfade = true;

  protected event: Event;

  constructor(
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.event = events.find(event => event.id == params['id']);
    });
  }

}
