import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { fade } from '../shared/consntants/animations.constants';
import { LargeScreenDirective } from '../shared/directives/largescreen.directive';
import { SmallScreenDirective } from '../shared/directives/smallscreen.directive';
import { FirebaseAuthService } from '../shared/services/firebase-auth.service';

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

  protected id: string;

  constructor(
    private route: ActivatedRoute,
    protected authService: FirebaseAuthService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => this.id = params['id']);
  }

}
