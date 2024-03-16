import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { events } from '../events/events';
import { Event } from '../models/event.interface';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.scss']
})
export class RulesComponent implements OnInit {

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
