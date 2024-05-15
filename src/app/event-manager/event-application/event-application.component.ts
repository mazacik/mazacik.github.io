import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseAuthService } from 'src/app/shared/services/firebase-auth.service';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { Event } from '../models/event.interface';
import { EventManagerService } from '../services/event-manager.service';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { raftingRules } from '../data/rafting-rules';

@Component({
  selector: 'app-event-application',
  standalone: true,
  imports: [
    CommonModule,
    CreateDirective
  ],
  templateUrl: './event-application.component.html',
  styleUrls: ['./event-application.component.scss']
})
export class EventApplicationComponent implements OnInit {

  protected rules = raftingRules;
  protected event: Event;

  protected consent: boolean = false;
  protected agreeToPay: boolean = false;

  constructor(
    private router: Router,
    private firestoreService: FirestoreService,
    private eventManagerService: EventManagerService,
    protected route: ActivatedRoute,
    protected authService: FirebaseAuthService
  ) { }

  ngOnInit(): void {
    this.event = this.eventManagerService.event;
  }

  protected createAuthButton(elementRef: ElementRef<HTMLElement>) {
    this.authService.createButton(elementRef.nativeElement);
  }

  protected apply(): void {
    if (this.consent) {
      console.log('applied');
    }
  }

}
