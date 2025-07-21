import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TippyDirective } from '@ngneat/helipopper';
import { drawer } from 'src/app/shared/constants/animations.constants';
import { DragDropDirective } from 'src/app/shared/directives/dragdrop.directive';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Note } from '../../models/note.interface';
import { Story } from '../../models/story.interface';
import { StoryManagerGoogleDriveService } from '../../services/story-manager-google-drive.service';
import { StoryManagerStateService } from '../../services/story-manager-state.service';
import { NoteTagManagerComponent } from '../notes/note-tag-manager/note-tag-manager.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropDirective,
    TippyDirective
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  animations: [drawer]
})
export class SidebarComponent implements OnInit {

  protected searchQuery: string;
  protected searchStories: Story[] = [];
  protected searchNotes: Note[] = [];

  constructor(
    private dialogService: DialogService,
    protected googleService: StoryManagerGoogleDriveService,
    protected stateService: StoryManagerStateService
  ) { }

  ngOnInit(): void {

  }

  setCurrentNote(note: Note): void {
    this.setCurrentStory(note.parent);
    this.stateService.currentNote = note;
    if (!ScreenUtils.isLargeScreen()) {
      this.stateService.sidebarVisible = false;
    }
  }

  setCurrentStory(story: Story, alsoNote: boolean = false): void {
    this.stateService.currentStory = story;
    if (alsoNote && !ArrayUtils.isEmpty(story.notes)) {
      this.stateService.currentNote = story.notes[0];
    }
  }

  createStory(): void {
    this.dialogService.createInput('Story Title', 'Title', null, 'OK').then(title => {
      if (title) {
        this.stateService.stories.push({ title: title, notes: [], noteTags: [] });
        this.googleService.update(true);
      }
    });
  }

  renameStory(story: Story): void {
    this.dialogService.createInput('Rename', 'Story Title', story.title, 'OK').then(title => {
      if (!StringUtils.isEmpty(title)) {
        story.title = title;
        this.googleService.update(true);
      }
    });
  }

  deleteStory(story: Story): void {
    this.dialogService.createConfirmation('Delete', ['Are you sure you want to delete "' + story.title + '"?'], 'Yes', 'No').then(result => {
      if (result) {
        if (story == this.stateService.currentStory) {
          this.setCurrentStory(ArrayUtils.nearestRightFirst(this.stateService.stories, this.stateService.stories.indexOf(story)));
        }

        ArrayUtils.remove(this.stateService.stories, story);
        this.googleService.update();
      }
    });
  }

  getNotesWordCount(story: Story): string {
    const count: number = story.notes.flatMap(note => note.wordCount).reduce((sum, current) => sum + current, 0);
    return count > 0 ? count + '' : '';
  }

  editTags(note: Note): void {
    this.dialogService.create(NoteTagManagerComponent, { note }).then(tags => {
      if (tags && Array.isArray(tags)) {
        note.tags = tags;
        this.googleService.update(true);
      }
    });
  }

  createNote(story: Story): void {
    this.dialogService.createInput('Note Title', 'Title', null, 'OK').then(title => {
      if (title) {
        const note: Note = { title: title, text: '', tags: [], wordCount: 0, parent: story };
        story.notes.push(note);
        this.stateService.currentNote = note;
        this.stateService.currentStory = story;
        this.googleService.update(true);
      }
    });
  }

  renameNote(note: Note): void {
    this.dialogService.createInput('Rename', 'Note Title', note.title, 'OK').then(title => {
      if (!StringUtils.isEmpty(title)) {
        note.title = title;
        this.googleService.update(true);
      }
    });
  }

  deleteNote(story: Story, note: Note): void {
    const notes: Note[] = story.notes;
    this.dialogService.createConfirmation('Delete', ['Are you sure you want to delete "' + note.title + '"?'], 'Yes', 'No').then(result => {
      if (result) {
        if (note == this.stateService.currentNote) this.stateService.currentNote = null;
        ArrayUtils.remove(notes, note);
        this.googleService.update(true);
      }
    });
  }

  protected onSearchInputChange(element: HTMLInputElement): void {
    this.searchQuery = element.value;
    this.searchStories.length = 0;
    this.searchNotes.length = 0;
    if (!StringUtils.isEmpty(this.searchQuery)) {
      for (const story of this.stateService.stories) {
        for (const note of story.notes) {
          if (note.text.match(new RegExp(this.searchQuery, 'i'))) {
            ArrayUtils.push(this.searchStories, story);
            ArrayUtils.push(this.searchNotes, note);
          }
        }
      }
    }
  }

}
