import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StoryStatus } from 'src/app/story-manager/models/story-status.enum';
import { Story } from 'src/app/story-manager/models/story.interface';
import { StoryManagerGoogleDriveService } from 'src/app/story-manager/services/story-manager-google-drive.service';
import { StoryManagerStateService } from 'src/app/story-manager/services/story-manager-state.service';

@Component({
  selector: 'app-story-options',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './story-options.component.html',
  styleUrls: ['./story-options.component.scss']
})
export class StoryOptionsComponent extends DialogContentBase<void> {

  // TODO make a generic component like this (buttons that do something)

  public override inputs: { story: Story };

  public configuration: DialogContainerConfiguration = {
    title: () => this.inputs.story.title,
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
      title: 'Rename: ' + this.inputs.story.title,
      placeholder: 'Name',
      defaultValue: this.inputs.story.title
    });

    if (!StringUtils.isEmpty(input)) {
      this.inputs.story.title = input;
      this.googleService.update(true);
    }
  }

  public async changeStatus(): Promise<void> {
    this.close();

    const input: StoryStatus = await this.dialogService.createSelect({
      title: 'Rename: ' + this.inputs.story.title,
      options: Object.values(StoryStatus),
      nullOption: '',
      defaultValue: this.inputs.story.status,
    });

    if (input !== undefined) {
      this.inputs.story.status = input;
      this.googleService.update(true);
    }
  }

  public async delete(): Promise<void> {
    this.close();

    const confirmation: boolean = await this.dialogService.createConfirmation({
      title: 'Confirmation',
      messages: ['Delete \'' + this.inputs.story.title + '\'?']
    });

    if (confirmation) {
      if (this.stateService.currentStory == this.inputs.story) this.stateService.currentStory = null;
      ArrayUtils.remove(this.stateService.stories, this.inputs.story);
      this.googleService.update(true);
    }
  }

  public close(): void {
    this.resolve();
  }

}
