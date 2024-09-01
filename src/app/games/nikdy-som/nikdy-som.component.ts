import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';

@Component({
  selector: 'app-nikdy-som',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './nikdy-som.component.html',
  styleUrls: ['./nikdy-som.component.scss']
})
export class NikdySomComponent implements OnInit {

  private questions: string[] = [
    'nikdy som si neochutnal šušník',
    'nikdy som si neskúšal niečo strčiť do zadku',
    'nikdy som sa dospelý neposral'
  ];
  protected availableQuestions: string[];
  protected currentQuestion: string;

  constructor() { }

  ngOnInit(): void {
    this.availableQuestions = ArrayUtils.shuffle(this.questions.slice());
    this.next();
  }

  protected next(): void {
    this.currentQuestion = this.availableQuestions.pop();
  }

}
