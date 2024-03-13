import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FirebaseAuthService } from '../shared/services/firebase-auth.service';

@Component({
  selector: 'app-rafting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterOutlet
  ],
  templateUrl: './rafting.component.html',
  styleUrls: ['./rafting.component.scss']
})
export class RaftingComponent implements OnInit {

  constructor(
    protected authService: FirebaseAuthService
  ) { }

  ngOnInit(): void {

  }

}
