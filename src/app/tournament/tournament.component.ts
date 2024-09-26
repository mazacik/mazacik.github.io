import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tournament2 } from '../shared/classes/tournament2.class';
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

  text: string = '1\n2\n3\n4\n5\n6\n7\n8\n';
  entries: string[] = [];
  tournament: Tournament2<string>;
  result: string[][] = [];

  constructor() {

  }

  ngOnInit(): void {

  }

  parseText(): void {
    this.entries = this.text.split('\n').filter(e => e?.length > 0);
    this.tournament = new Tournament2(this.entries, e => e);
    this.text = '';
  }

  onEntryClick(winner: Contender<string>, loser: Contender<string>): void {
    this.tournament.addComparisonResult(winner, loser);
    this.text = this.tournament.leaderboard.join('\n');
  }

}
