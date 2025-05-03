import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { RandomUtils } from 'src/app/shared/utils/random.utils';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.scss']
})
export class ActivityComponent implements OnInit {

  private phrases: string[] = [
    'kohútik',
    'sliepočka',
    'kuriatko'
  ];
  protected availablePhrases: string[];

  protected teams: {
    wins: number,
    roundDisciplines: string[],
    roundsForEveryone: number[],
  }[];

  protected currentView: 'settings' | 'instructions' | 'countdown' | 'result' | 'score' = 'settings';

  private teamCount: number = 4;
  private teamCountValid: boolean = true;
  private roundDuration: number = 60;
  private roundDurationValid: boolean = true;
  private forEveryoneChanceOneIn: number = 6;
  private beforeRoundStartDuration: number = 3;

  private currentTeamIndex: number;

  private interval: NodeJS.Timeout;
  protected timeLeft: number;
  protected showEndRoundEarlyButton: boolean;

  private forEveryoneWinnerTeamIndex: number;
  protected forEveryoneWinnerTeamIndexValid: boolean = false;

  constructor() { }

  ngOnInit(): void {

  }

  protected onTeamCountChange(element: HTMLInputElement): void {
    const value: number = Number.parseInt(element.value);
    if (value >= 2) {
      this.teamCount = value;
      this.teamCountValid = true;
      element.style.borderColor = window.getComputedStyle(document.body).getPropertyValue('--color-border');
    } else {
      this.teamCountValid = false;
      element.style.borderColor = 'red';
    }
  }

  protected onRoundDurationChange(element: HTMLInputElement): void {
    const value: number = Number.parseInt(element.value);
    if (value > 0) {
      this.roundDuration = value;
      this.roundDurationValid = true;
      element.style.borderColor = window.getComputedStyle(document.body).getPropertyValue('--color-border');
    } else {
      this.roundDurationValid = false;
      element.style.borderColor = 'red';
    }
  }

  protected validateSettings(): boolean {
    return this.teamCountValid && this.roundDurationValid;
  }

  protected settingsDone(): void {
    if (this.validateSettings()) {
      this.startGame();
    }
  }

  private startGame(): void {
    this.currentView = 'instructions';
    this.currentTeamIndex = 0;
    this.availablePhrases = ArrayUtils.shuffle(this.phrases.slice());

    this.teams = [];
    for (let i = 0; i < this.teamCount; i++) {
      this.teams.push({
        wins: 0,
        roundDisciplines: [],
        roundsForEveryone: []
      });
    }

    const setCount: number = Math.floor(this.phrases.length / 3);
    for (let i = 0; i < setCount; i++) {
      this.teams.forEach(team => ArrayUtils.push(team.roundDisciplines, ArrayUtils.shuffle(['hovorenie', 'kreslenie', 'ukazovanie'])));
    }

    const forEveryoneCount: number = Math.ceil(this.phrases.length / this.forEveryoneChanceOneIn);
    for (let i = 0; i < forEveryoneCount; i++) {
      this.teams.forEach(team => team.roundsForEveryone.push(Math.floor(RandomUtils.random(i * this.forEveryoneChanceOneIn, (i + 1) * this.forEveryoneChanceOneIn))));
    }
  }

  protected getCurrentDiscipline(): string {
    const currentTeam = this.teams[this.currentTeamIndex];
    return currentTeam.roundDisciplines[currentTeam.wins];
  }

  protected isCurrentRoundForEveryone(): boolean {
    const currentTeam = this.teams[this.currentTeamIndex];
    return currentTeam.roundsForEveryone.includes(currentTeam.wins);
  }

  protected startRound(): void {
    this.currentView = 'countdown';
    this.timeLeft = this.beforeRoundStartDuration;
    this.showEndRoundEarlyButton = false;
    this.interval = setInterval(() => {
      if (--this.timeLeft < 1) {
        clearInterval(this.interval);
        this.timeLeft = this.roundDuration;
        this.showEndRoundEarlyButton = true;
        this.interval = setInterval(() => {
          if (--this.timeLeft < 1) {
            clearInterval(this.interval);
            // maybe play sound
            this.currentView = 'result';
          }
        }, 1000);
      }
    }, 1000);
  }

  protected endRoundEarly(): void {
    clearInterval(this.interval);
    this.currentView = 'result';
  }

  protected onForEveryoneWinnerChange(element: HTMLInputElement): void {
    const value: number = Number.parseInt(element.value);
    if (value > 0 && value <= this.teams.length) {
      this.forEveryoneWinnerTeamIndex = value - 1;
      this.forEveryoneWinnerTeamIndexValid = true;
      element.style.borderColor = window.getComputedStyle(document.body).getPropertyValue('--color-border');
    } else {
      this.forEveryoneWinnerTeamIndexValid = false;
      element.style.borderColor = 'red';
    }
  }

  protected roundOver(win: boolean): void {
    this.availablePhrases.shift();
    if (win) this.teams[this.forEveryoneWinnerTeamIndex || this.currentTeamIndex].wins++;
    this.forEveryoneWinnerTeamIndex = null;
    if (++this.currentTeamIndex == this.teamCount) this.currentTeamIndex = 0;
    this.currentView = 'score';
  }

}
