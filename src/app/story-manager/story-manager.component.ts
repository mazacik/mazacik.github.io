import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TippyDirective } from '@ngneat/helipopper';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { ArrayUtils } from '../shared/utils/array.utils';
import { StringUtils } from '../shared/utils/string.utils';
import { NoteOptionsComponent } from './components/dialogs/note-options/note-options.component';
import { StoryOptionsComponent } from './components/dialogs/story-options/story-options.component';
import { Note } from './models/note.interface';
import { Story } from './models/story.interface';
import { StoryManagerGoogleDriveService } from './services/story-manager-google-drive.service';
import { StoryManagerStateService } from './services/story-manager-state.service';
import { StoryStatus } from './models/story-status.enum';

@Component({
  selector: 'app-story-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TippyDirective
  ],
  templateUrl: './story-manager.component.html',
  styleUrls: ['./story-manager.component.scss']
})
export class StoryManagerComponent implements OnInit {

  private countdownInputRegex = /^([0-9]*[1-9]+[0-9]*[hms])+$/gi;
  private countdown = { hours: 0, minutes: 0, seconds: 0 };
  private countdownInterval: NodeJS.Timeout;

  protected dragStartArray: any[];
  protected dragStartObject: any;
  protected dragStartIndex: number;

  constructor(
    private dialogService: DialogService,
    private googleService: StoryManagerGoogleDriveService,
    protected applicationService: ApplicationService,
    protected stateService: StoryManagerStateService,
  ) { }

  ngOnInit(): void {
    this.googleService.request().then(data => {
      if (data) {
        this.stateService.initialize(data);
        this.applicationService.loading.set(false);
      }
    });
  }

  protected createStory(): void {
    this.dialogService.createInput({ title: 'Create Story', placeholder: 'Story Title' }).then(title => {
      if (title) {
        this.stateService.stories.unshift({ title: title, notes: [], noteTags: [] });
        this.googleService.update(true);
      }
    });
  }

  protected createNote(): void {
    this.dialogService.createInput({ title: 'Create Note', placeholder: 'Note Title' }).then(title => {
      if (title) {
        const note: Note = { title: title, text: '', tags: [], wordCount: 0 };
        this.stateService.currentStory.notes.unshift(note);
        this.stateService.currentStory.currentNote = note;
        this.googleService.update(true);
      }
    });
  }

  protected openStoryOptions(event: MouseEvent, story: Story): void {
    event.stopPropagation();
    this.dialogService.create(StoryOptionsComponent, { story: story });
  }

  protected openNoteOptions(event: MouseEvent, note: Note): void {
    event.stopPropagation();
    this.dialogService.create(NoteOptionsComponent, { note: note });
  }

  protected getNavigationText(): string {
    if (this.stateService.currentStory) {
      if (this.stateService.currentStory.currentNote) {
        return this.stateService.currentStory.title + ' | ' + this.stateService.currentStory.currentNote.title;
      } else {
        return this.stateService.currentStory.title;
      }
    } else {
      return '';
    }
  }

  protected navigationBack(): void {
    if (this.stateService.currentStory) {
      if (this.stateService.currentStory.currentNote) {
        this.stateService.currentStory.currentNote = null;
      } else {
        this.stateService.currentStory = null;
      }
    }
  }

  protected onTagsInputSubmit(event: KeyboardEvent, element: HTMLInputElement): void {
    if (event.key === 'Enter') {
      this.stateService.currentStory.tags
      element.value = '';
    }
  }

  protected onNoteTextChange(): void {
    const currentNote: Note = this.stateService.currentStory.currentNote;
    currentNote.wordCount = StringUtils.getWordCount(currentNote.text);
    this.googleService.update();
  }

  protected onDragStart(array: any[], object: any): void {
    this.dragStartArray = array;
    this.dragStartObject = object;
    this.dragStartIndex = this.stateService.stories.indexOf(object);
  }

  protected onDragEnter(object: any): void {
    if (object != this.dragStartObject) {
      ArrayUtils.move(this.dragStartArray, this.dragStartObject, this.dragStartArray.indexOf(object));
    }
  }

  protected onDragDrop(): void {
    this.googleService.update();
    this.dragStartArray = null;
    this.dragStartObject = null;
    this.dragStartIndex = null;
  }

  protected onDragEnd(): void {
    if (this.dragStartObject) {
      ArrayUtils.move(this.dragStartArray, this.dragStartObject, this.dragStartIndex); // starting position
      this.onDragDrop();
    }
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
