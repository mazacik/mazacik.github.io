import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { questionsGeneric, questionsNsfw, questionsSpicy } from './nikdy-som-questions';

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

  protected availableQuestions: string[] = [];
  protected currentQuestion: string;

  constructor() { }

  ngOnInit(): void {
    this.reset();
  }

  protected reset(): void {
    this.availableQuestions.length = 0;
    ArrayUtils.push(this.availableQuestions, questionsGeneric);
    ArrayUtils.push(this.availableQuestions, questionsNsfw);
    ArrayUtils.push(this.availableQuestions, questionsSpicy);
    ArrayUtils.shuffle(this.availableQuestions);
    this.next();
  }

  protected next(): void {
    this.currentQuestion = this.availableQuestions.pop();
  }

}
