import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Event } from '../models/event.interface';
import { EventManagerService } from '../services/event-manager.service';

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
    private eventManagerService: EventManagerService
  ) { }

  ngOnInit(): void {
    this.event = this.eventManagerService.event;

  }

}
