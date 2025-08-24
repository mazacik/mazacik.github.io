import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { Article } from 'src/app/story-manager/models/article.class';
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

  public override inputs: { article?: Article };

  public configuration: DialogContainerConfiguration = {
    title: () => this.inputs.article ? this.inputs.article.title : 'Root',
    buttons: [{
      text: () => 'Cancel',
      click: () => this.close()
    }]
  };

  constructor(
    private stateService: StoryManagerStateService
  ) {
    super();
  }

  public async rename(): Promise<void> {
    this.close();
    this.stateService.rename(this.inputs.article);
  }

  public async create(folder: boolean): Promise<void> {
    this.close();
    this.stateService.create(this.inputs.article, folder);
  }

  public async delete(): Promise<void> {
    this.close();
    this.stateService.delete(this.inputs.article);
  }

  public close(): void {
    this.resolve();
  }

}
