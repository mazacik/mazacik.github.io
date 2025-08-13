import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Note } from 'src/app/story-manager/models/note.interface';
import { Story } from 'src/app/story-manager/models/story.interface';
import { StoryManagerGoogleDriveService } from 'src/app/story-manager/services/story-manager-google-drive.service';
import { StoryManagerStateService } from 'src/app/story-manager/services/story-manager-state.service';

@Component({
  selector: 'app-note-options',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './note-options.component.html',
  styleUrls: ['./note-options.component.scss']
})
export class NoteOptionsComponent extends DialogContentBase<void> {

  // TODO make a generic component like this (buttons that do something)

  public override inputs: { note: Note };

  public configuration: DialogContainerConfiguration = {
    title: () => this.inputs.note.title,
    buttons: [{
      text: () => 'Cancel',
      click: () => this.close()
    }]
  };

  constructor(
    private dialogService: DialogService,
    private stateService: StoryManagerStateService,
    private googleService: StoryManagerGoogleDriveService,
  ) {
    super();
  }

  public async rename(): Promise<void> {
    this.close();

    const input: string = await this.dialogService.createInput({
      title: 'Rename: ' + this.stateService.currentStory.title + ' | ' + this.inputs.note.title,
      placeholder: 'Name',
      defaultValue: this.inputs.note.title
    });

    if (!StringUtils.isEmpty(input)) {
      this.inputs.note.title = input;
      this.googleService.update(true);
    }
  }

  public async delete(): Promise<void> {
    this.close();

    const story: Story = this.stateService.currentStory;
    const confirmation: boolean = await this.dialogService.createConfirmation({
      title: 'Confirmation',
      messages: ['Delete \'' + story.title + ' | ' + this.inputs.note.title + '\'?']
    });

    if (confirmation) {
      if (story.currentNote == this.inputs.note) story.currentNote = null;
      ArrayUtils.remove(story.notes, this.inputs.note);
      this.googleService.update(true);
    }
  }

  public close(): void {
    this.resolve();
  }

}
