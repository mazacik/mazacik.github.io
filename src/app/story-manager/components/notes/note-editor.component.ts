import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StoryManagerGoogleDriveService } from '../../services/story-manager-google-drive.service';
import { StoryManagerStateService } from '../../services/story-manager-state.service';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './note-editor.component.html',
  styleUrls: ['./note-editor.component.scss']
})
export class NoteEditorComponent implements OnInit {

  constructor(
    public googleService: StoryManagerGoogleDriveService,
    private applicationService: ApplicationService,
    protected stateService: StoryManagerStateService
  ) {
    this.applicationService.loading.next(true);
  }

  ngOnInit(): void {

  }

  onChange(): void {
    this.stateService.currentNote.wordCount = StringUtils.getWordCount(this.stateService.currentNote.text);
    this.googleService.update();
  }

}
