import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { crossfade, drawer, enter, fade, skip } from 'src/app/shared/consntants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { events } from '../events/events';
import { Event } from '../models/event.interface';
import { SurveyResult } from '../models/survey-result.interface';

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

  protected event: Event;
  protected databaseEntries: SurveyResult[];
  protected statistics;

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.event = events.find(event => event.id == params['id']);
      this.requestResults();
    });
  }

  private requestResults(): void {
    this.firestoreService.read(this.event.id).then((docs: SurveyResult[]) => {
      this.databaseEntries = docs;
      this.statistics = this.event.questions.map(question => {
        return {
          id: question.id,
          title: question.title,
          votes: docs.length,
          open: this.event.questions.indexOf(question) == 0,
          options: question.choices?.map(option => {
            return {
              id: option.id,
              text: option.text,
              description: option.description,
              hyperlink: option.hyperlink,
              count: docs.filter(doc => doc.choices[question.id].includes(option.id)).length
            }
          }).sort((o1, o2) => o2.count - o1.count)
        }
      });
    });
  }

  protected open(result) {
    this.statistics.forEach(r => r.open = false);
    result.open = true;
  }

}
