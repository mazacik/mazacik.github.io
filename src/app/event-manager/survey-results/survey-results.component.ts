import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { crossfade, drawer2, fade } from 'src/app/shared/consntants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { Event } from '../models/event.interface';
import { SurveyResult } from '../models/survey-result.interface';
import { EventManagerService } from '../services/event-manager.service';

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
  animations: [crossfade, fade, drawer2]
})
export class SurveyResultsComponent implements OnInit {

  @HostBinding('@crossfade') crossfade = true;

  protected event: Event;
  protected userEntries: SurveyResult[];
  protected statistics;

  constructor(
    private firestoreService: FirestoreService,
    private eventManagerService: EventManagerService
  ) { }

  ngOnInit(): void {
    this.event = this.eventManagerService.event;
    this.requestResults();
  }

  private requestResults(): void {
    this.firestoreService.read(this.event.id).then((docs: SurveyResult[]) => {
      this.userEntries = docs;
      this.statistics = this.event.questions.map(question => {
        return {
          id: question.id,
          title: question.title,
          votes: docs.filter(doc => !doc.choices[question.id].includes('dontcare')).length,
          open: this.event.questions.indexOf(question) == 0,
          options: question.choices?.map(option => {
            return {
              id: option.id,
              text: option.text,
              description: option.description,
              hyperlink: option.hyperlink,
              people: docs.filter(doc => doc.choices[question.id].includes(option.id)).map(doc => doc.userDisplayName),
              count: docs.filter(doc => !doc.choices[question.id].includes('dontcare') && doc.choices[question.id].includes(option.id)).length
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

  protected getShortName(displayName: string): string {
    if (window.innerWidth > 600) {
      return displayName;
    } else {
      const [firstName, lastName] = displayName.split(' ');
      return firstName.substring(0, 10) + ' ' + lastName[0];
    }
    
  }

}
