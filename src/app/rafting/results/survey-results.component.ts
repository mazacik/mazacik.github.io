import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { crossfade, drawer, enter, fade, skip } from 'src/app/shared/consntants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { SurveyQuestion } from '../models/survey-question.interface';
import { survey } from '../survey/survey';

@Component({
  selector: 'app-survey-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VariableDirective
  ],
  templateUrl: './survey-results.component.html',
  styleUrls: ['./survey-results.component.scss'],
  animations: [crossfade, enter, drawer, fade, skip]
})
export class SurveyResultsComponent implements OnInit {

  @HostBinding('@crossfade') crossfade = true;

  protected polls: SurveyQuestion[] = survey;
  protected results;

  constructor(
    private firestoreService: FirestoreService
  ) { }

  ngOnInit(): void {
    this.requestResults();
  }

  private requestResults(): void {
    this.firestoreService.read('2024-survey').then(docs => {
      this.results = this.polls.filter(poll => poll.type != 'text').map(poll => {
        return {
          id: poll.id,
          title: poll.title,
          votes: docs.length,
          open: this.polls.indexOf(poll) == 0,
          options: poll.options?.map(option => {
            return {
              id: option.id,
              text: option.text,
              hyperlink: option.hyperlink,
              count: docs.filter(doc => doc[poll.id].includes(option.id)).length
            }
          }).sort((o1, o2) => o2.count - o1.count)
        }
      });
    });
  }

  protected open(result) {
    this.results.forEach(r => r.open = false);
    result.open = true;
  }

}
