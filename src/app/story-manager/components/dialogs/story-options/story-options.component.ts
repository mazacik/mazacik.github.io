import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { Article } from 'src/app/story-manager/models/article.class';
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
export class ArticleOptionsComponent extends DialogContentBase<void> {

  // TODO make a generic component like this (buttons that do something)

  public override inputs: { article: Article };

  public configuration: DialogContainerConfiguration = {
    title: () => this.inputs.article.title,
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
    this.stateService.rename(this.inputs.article);
  }

  public async delete(): Promise<void> {
    this.close();
    this.stateService.delete(this.inputs.article);
  }

  public close(): void {
    this.resolve();
  }

}
