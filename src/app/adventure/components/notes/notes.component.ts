import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { AdventureGoogleDriveService } from '../../services/adventure-google-drive.service';
import { AdventureStateService } from '../../services/adventure-state.service';
import { NotesService } from './notes.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CreateDirective,
    VariableDirective
  ],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss']
})
export class NotesComponent implements OnInit {

  constructor(
    public googleService: AdventureGoogleDriveService,
    private applicationService: ApplicationService,
    protected stateService: AdventureStateService,
    protected notesService: NotesService
  ) {
    this.applicationService.loading.next(true);
  }

  ngOnInit(): void {
    
  }

  initTab(elementRef: ElementRef<HTMLTextAreaElement>): void {
    const that: NotesComponent = this;
    elementRef.nativeElement.addEventListener('keydown', function (event) {
      if (event.key == 'Tab') {
        event.preventDefault();
        const selectionStart: number = this.selectionStart;
        const selectionEnd: number = this.selectionEnd;
        this.value = this.value.substring(0, selectionStart) + "\t" + this.value.substring(selectionEnd);
        this.selectionStart = this.selectionEnd = selectionStart + 1;
        that.onNoteInput();
      }
    });
  }

  onNoteInput(): void {
    this.notesService.focusNote.wordCount = StringUtils.getWordCount(this.notesService.focusNote.text);
    this.googleService.updateAdventure();
  }

  // @HostListener('window:keydown', ['$event'])
  // noteContentCutLine(event: KeyboardEvent): void {
  //   if (event.ctrlKey && event.code == 'KeyX') {
  //     const noteContent: HTMLTextAreaElement = document.getElementsByClassName('note-content')[0] as HTMLTextAreaElement;
  //     if (noteContent.selectionEnd == noteContent.selectionStart) {
  //       const text: string = this.notesService.focusNote.text;
  //       const start: number = text.substring(0, noteContent.selectionEnd).lastIndexOf('\n') + 1;
  //       const end: number = text.indexOf('\n', noteContent.selectionEnd) + 1;
  //       navigator.clipboard.writeText(text.substring(start, end));
  //       this.notesService.focusNote.text = text.substring(0, start) + text.substring(end == 0 ? text.length : end);
  //       this.notesService.focusNote.wordCount = StringUtils.getWordCount(this.notesService.focusNote.text);
  //       setTimeout(() => noteContent.setSelectionRange(start, start));
  //       this.googleService.updateAdventure();
  //     }
  //   }
  // }

}
