import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { ApplicationService } from '../shared/services/application.service';
import { NotesComponent } from './components/notes/notes.component';
import { ScenarioBrowserComponent } from './components/scenario-browser/scenario-browser.component';
import { AdventureActionService } from './services/adventure-action.service';
import { AdventureEditorService } from './services/adventure-editor.service';
import { AdventureGoogleDriveService } from './services/adventure-google-drive.service';
import { AdventureStateService } from './services/adventure-state.service';
import { GraphRendererService } from './services/graph-renderer.service';

@Component({
  selector: 'app-adventure',
  standalone: true,
  imports: [
    CommonModule,
    ScenarioBrowserComponent,
    NotesComponent,
    TippyDirective
  ],
  templateUrl: './adventure.component.html',
  styleUrls: ['./adventure.component.scss']
})
export class AdventureComponent implements OnInit {

  private countdownInputRegex = /^([0-9]*[1-9]+[0-9]*[hms])+$/gi;
  private countdown = { hours: 0, minutes: 0, seconds: 0 };
  private countdownInterval: NodeJS.Timeout;

  constructor(
    public googleService: AdventureGoogleDriveService,
    private graphService: GraphRendererService,
    protected editorService: AdventureEditorService,
    protected applicationService: ApplicationService,
    protected stateService: AdventureStateService,
    protected actionService: AdventureActionService
  ) {
    this.applicationService.loading.next(true);
  }

  ngOnInit(): void {
    this.googleService.requestAdventure().then(serializable => {
      this.stateService.initialize(serializable);
      this.graphService.renderNotes();
      this.applicationService.loading.next(false);
    });
  }

  protected import(): void {
    navigator.clipboard.readText().then(text => this.stateService.initialize(JSON.parse(text)));
  }

  protected export(): void {
    const jsonData: string = JSON.stringify(this.stateService.serialize());
    navigator.clipboard.writeText(jsonData);
    console.log(jsonData);
  }

  protected onCountdownInputChange(element: HTMLInputElement): void {
    const value: string = element.value.replace(/\W/g, '');
    if (value.match(this.countdownInputRegex)) {
      element.classList.remove('error');
    } else {
      element.classList.add('error');
    }
  }

  protected onCountdownInputSubmit(event: KeyboardEvent, element: HTMLInputElement): void {
    if (event.key === 'Enter') {
      const value: string = element.value.replace(/\W/g, '');
      if (value.match(this.countdownInputRegex)) {
        element.readOnly = true;

        const reducer = (value: string[]) => value && value.map(hours => hours.replace(/\D/g, '')).reduce((accumulator, currentValue) => accumulator + Number.parseInt(currentValue), 0);
        this.countdown.hours = reducer(value.match(/\d+h/gi));
        this.countdown.minutes = reducer(value.match(/\d+m/gi));
        this.countdown.seconds = reducer(value.match(/\d+s/gi));

        this.countdown.minutes += + Math.floor(this.countdown.seconds / 60);
        this.countdown.seconds %= 60;

        this.countdown.hours += + Math.floor(this.countdown.minutes / 60);
        this.countdown.minutes %= 60;

        this.countdownInterval = setInterval(() => {
          if (this.countdown.hours > 0) {
            element.value = this.countdown.hours.toString().padStart(2, '0') + 'h ' + this.countdown.minutes.toString().padStart(2, '0') + 'm ' + this.countdown.seconds.toString().padStart(2, '0') + 's';
          } else if (this.countdown.minutes > 0) {
            element.value = this.countdown.minutes.toString().padStart(2, '0') + 'm ' + this.countdown.seconds.toString().padStart(2, '0') + 's';
          } else {
            element.value = this.countdown.seconds.toString().padStart(2, '0') + 's';
          }

          if (this.countdown.seconds-- == 0) {
            this.countdown.seconds = 59;
            if (this.countdown.minutes-- == 0) {
              if (this.countdown.hours == 0) {
                element.value = '';
                element.readOnly = false;
                clearInterval(this.countdownInterval);
              } else {
                this.countdown.minutes = 59;
                this.countdown.hours--;
              }
            }
          }
        }, 1000);
      }
    }
  }

  protected onCountdownInputClick(element: HTMLInputElement): void {
    if (element.readOnly) {
      element.value = '';
      element.readOnly = false;
      clearInterval(this.countdownInterval);
    }
  }

}
