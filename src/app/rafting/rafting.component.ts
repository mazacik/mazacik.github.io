import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-rafting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet
  ],
  templateUrl: './rafting.component.html',
  styleUrls: ['./rafting.component.scss']
})
export class RaftingComponent implements OnInit {

  constructor() {

  }

  ngOnInit(): void {

  }

}
