import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TippyDirective } from '@ngneat/helipopper';
import { crossfade, drawer, enter, fade, leave, skip } from 'src/app/shared/consntants/animations.constants';
import { OnCreateDirective } from 'src/app/shared/directives/on-create.directive';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { FirebaseAuthService } from 'src/app/shared/services/firebase-auth.service';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { SurveyChoice } from '../models/survey-choice.interface';
import { SurveyQuestion } from '../models/survey-question.interface';
import { survey } from './survey';

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
  animations: [crossfade, drawer, enter, fade, leave, skip]
})
export class SurveyComponent implements OnInit {

  @HostBinding('@crossfade') crossfade = true;

  protected currentIndex: number = 0;

  protected polls: SurveyQuestion[] = survey;

  constructor(
    protected authService: FirebaseAuthService,
    private firestoreService: FirestoreService,
    private router: Router
  ) { }

  ngOnInit(): void {
  }

  protected onOptionChange(poll: SurveyQuestion, option: SurveyChoice): void {
    if (poll.type == 'checkbox') {
      if (poll.dontcare) {
        if (option.id == 'dontcare') {
          poll.options.forEach(option => option.selected = false);
        } else {
          poll.options.find(option => option.id == 'dontcare').selected = false;
        }
      }
    } else if (poll.type == 'radio') {
      poll.options.forEach(option => option.selected = false);
    }

    option.selected = true;
  }

  private directionTimeout: NodeJS.Timeout;
  protected back(): void {
    clearTimeout(this.directionTimeout);
    const container = document.querySelector('.poll-container') as HTMLElement;
    container.style.flexDirection = 'column-reverse';
    this.directionTimeout = setTimeout(() => container.style.flexDirection = 'column', 500);
    if (this.currentIndex > 0) this.currentIndex--;
  }

  protected next(): void {
    clearTimeout(this.directionTimeout);
    const container = document.querySelector('.poll-container') as HTMLElement;
    container.style.flexDirection = 'column';
    this.currentIndex++;
  }

  protected submit(): void {
    if (this.authService.getUser()) {
      const entry = {};
      this.polls.filter(poll => poll.options).forEach(poll => {
        entry[poll.id] = poll.options.filter(option => option.selected).map(option => option.id);
      });

      this.firestoreService.write('2024-survey', entry);
      localStorage.setItem('2024-survey', new Date().toISOString());
      this.router.navigate(['/splav-2024/hlasovanie/vysledky']);
    }
  }

  protected createAuthButton(elementRef: ElementRef<HTMLElement>) {
    this.authService.createButton(elementRef.nativeElement);
  }

}
