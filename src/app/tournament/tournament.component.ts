import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tournament } from 'src/app/shared/classes/tournament.class';

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

  text: string = '01\n02\n03\n04\n05\n06\n07\n08\n';
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

  onEntryClick(winner: string, loser: string): void {
    this.tournament.addComparisonResult(winner, loser);
    this.text = this.tournament.leaderboard.join('\n');
  }

}
