import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { drawer, enter, fade, hidden, leave, skip } from 'src/app/shared/consntants/animations.constants';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { PollOption } from '../models/poll-option.interface';
import { Poll } from '../models/poll.interface';
import { polls } from './polls';

@Component({
  selector: 'app-polls',
  standalone: true,
  imports: [
    CommonModule,
    VariableDirective
  ],
  templateUrl: './polls.component.html',
  styleUrls: ['./polls.component.scss'],
  animations: [drawer, enter, fade, hidden, leave, skip]
})
export class PollsComponent implements OnInit {

  private readonly DONTCARE: string = 'Je mi to jedno';

  protected polls: Poll[];
  protected currentIndex: number = 0;

  constructor() {
    this.polls = polls.map(poll => {
      if (poll.dontcare) poll.options.push({ text: this.DONTCARE, selected: true });
      return poll;
    });
  }

  ngOnInit(): void {

  }

  protected onOptionChange(poll: Poll, option: PollOption): void {
    if (poll.type == 'checkbox') {
      if (poll.dontcare) {
        if (option.text == this.DONTCARE) {
          poll.options.forEach(option => option.selected = false);
        } else {
          poll.options.find(option => option.text == this.DONTCARE).selected = false;
        }
      }
    } else if (poll.type == 'radio') {
      poll.options.forEach(option => option.selected = false);
    }

    option.selected = true;
  }

  // TODO 1s timeout after last submit to avoid doubleclick
  protected submit(): void {
    if (++this.currentIndex == this.polls.length) {
      console.log(this.polls);
    }
  }

}
