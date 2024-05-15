import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TippyDirective } from '@ngneat/helipopper';
import { crossfade, drawer2, fade, skip } from 'src/app/shared/consntants/animations.constants';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { FirebaseAuthService } from 'src/app/shared/services/firebase-auth.service';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { Event } from '../models/event.interface';
import { SurveyChoice } from '../models/survey-choice.interface';
import { SurveyQuestion } from '../models/survey-question.interface';
import { SurveyResult } from '../models/survey-result.interface';
import { EventManagerService } from '../services/event-manager.service';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TippyDirective,
    VariableDirective,
    CreateDirective
  ],
  templateUrl: './survey.component.html',
  styleUrls: ['./survey.component.scss'],
  animations: [crossfade, drawer2, fade, skip]
})
export class SurveyComponent implements OnInit {

  protected event: Event;
  protected canVote: boolean;
  protected activeQuestions: SurveyQuestion[];
  protected questionIndex: number = 0;

  protected loading: boolean = true;

  constructor(
    private router: Router,
    private firestoreService: FirestoreService,
    private eventManagerService: EventManagerService,
    protected route: ActivatedRoute,
    protected authService: FirebaseAuthService
  ) { }

  ngOnInit(): void {
    this.event = this.eventManagerService.event;
    this.activeQuestions = this.event.questions.filter(question => question.active);

    const userPromise = this.authService.awaitUser();
    const resultsPromise = this.firestoreService.read(this.event.id, true) as Promise<SurveyResult[]>;
    Promise.all([userPromise, resultsPromise]).then(([user, results]) => {
      this.canVote = !results.some(result => result.userId == user?.uid);
      this.loading = false;
    });
  }

  protected onChoiceClick(question: SurveyQuestion, choice: SurveyChoice): void {
    if (question.type == 'checkbox') {
      if (question.dontcare) {
        if (choice.id == 'dontcare') {
          question.choices.forEach(choice => choice.selected = false);
          choice.selected = true;
        } else {
          question.choices.find(choice => choice.id == 'dontcare').selected = false;
          choice.selected = !choice.selected;
        }
      } else {
        choice.selected = !choice.selected;
      }
    } else if (question.type == 'radio') {
      question.choices.forEach(choice => choice.selected = false);
      choice.selected = true;
    }
  }

  protected back(): void {
    if (this.questionIndex > 0) this.questionIndex--;
  }

  protected next(): void {
    if (this.questionIndex < this.event.questions.length - 1) this.questionIndex++;
  }

  protected submit(): void {
    const user = this.authService.userS();
    if (user) {
      const entry: SurveyResult = {
        userId: user.uid,
        userDisplayName: user.displayName,
        submitDate: new Date().toISOString(),
        choices: {}
      };

      this.event.questions.filter(question => question.choices).forEach(question => {
        entry.choices[question.id] = question.choices.filter(choice => choice.selected).map(choice => choice.id);
      });

      this.firestoreService.write(this.event.id, user.uid, entry).then(() => {
        this.router.navigate(['./vysledky'], { relativeTo: this.route });
      });
    }
  }

  protected updateVote(): void {
    this.firestoreService.read(this.event.id).then((results: SurveyResult[]) => {
      const userVote = results.find(result => result.userId == this.authService.userS().uid);
      if (userVote) {
        this.event.questions.forEach(question => {
          question.choices.forEach(choice => {
            if (userVote.choices && userVote.choices[question.id])
              choice.selected = userVote.choices[question.id].includes(choice.id);
          });
        });
      }

      this.canVote = true;
    });
  }

  protected createAuthButton(elementRef: ElementRef<HTMLElement>) {
    this.authService.createButton(elementRef.nativeElement, null, (auth) => {
      if (auth?.user) {
        (this.firestoreService.read(this.event.id, true) as Promise<SurveyResult[]>).then(results => {
          this.canVote = !results.some(result => result.userId == auth.user.uid);
        });
      }
    });
  }

}
