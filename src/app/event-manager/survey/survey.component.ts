import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TippyDirective } from '@ngneat/helipopper';
import { crossfade, drawer2, fade, skip } from 'src/app/shared/consntants/animations.constants';
import { OnCreateDirective } from 'src/app/shared/directives/on-create.directive';
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
    OnCreateDirective
  ],
  templateUrl: './survey.component.html',
  styleUrls: ['./survey.component.scss'],
  animations: [crossfade, drawer2, fade, skip]
})
export class SurveyComponent implements OnInit {

  protected event: Event;
  protected userHasVote: boolean;
  protected questionIndex: number = 0;

  protected loadingDone: boolean = false;

  constructor(
    private router: Router,
    private firestoreService: FirestoreService,
    private eventManagerService: EventManagerService,
    protected route: ActivatedRoute,
    protected authService: FirebaseAuthService
  ) { }

  ngOnInit(): void {
    this.event = this.eventManagerService.event;
    const userPromise = this.authService.awaitUser();
    const resultsPromise = this.firestoreService.read(this.event.id, true) as Promise<SurveyResult[]>;
    Promise.all([userPromise, resultsPromise]).then(([user, results]) => {
      this.userHasVote = results.some(result => result.userId == user?.uid);
      this.loadingDone = true;
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
    const user = this.authService.getUser();
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

  protected resetVote(): void {
    this.firestoreService.delete(this.event.id, this.authService.getUser().uid).then(() => {
      this.userHasVote = false;
    });
  }

  protected createAuthButton(elementRef: ElementRef<HTMLElement>) {
    this.authService.createButton(elementRef.nativeElement, null, (auth) => {
      if (auth?.user) {
        (this.firestoreService.read(this.event.id, true) as Promise<SurveyResult[]>).then(results => {
          this.userHasVote = results.some(result => result.userId == auth.user.uid);
        });
      }
    });
  }



}
