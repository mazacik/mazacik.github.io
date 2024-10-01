import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tournament } from '../shared/classes/tournament.class';
import { Contender } from '../shared/classes/contender.class';

@Component({
  selector: 'app-tournament',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.scss']
})
export class TournamentComponent implements OnInit {

  // text: string = '01\n02\n03\n04\n05\n06\n07\n08\n';
  // text: string = '03\n08\n05\n06\n01\n04\n02\n07\n';
  text: string = '13\n09\n04\n08\n15\n02\n06\n03\n01\n11\n16\n07\n12\n10\n14\n05\n';
  entries: string[] = [];
  tournament: Tournament<string>;
  result: string[][] = [];

  constructor() {

  }

  ngOnInit(): void {

  }

  parseText(): void {
    this.entries = this.text.split('\n').filter(e => e?.length > 0);
    this.tournament = new Tournament(this.entries, e => e);
    this.text = '';
  }

  onEntryClick(winner: Contender<string>, loser: Contender<string>): void {
    this.tournament.handleUserInput(winner, loser);
    this.text = this.tournament.leaderboard.map(item => item.id).join('\n');
  }

}
