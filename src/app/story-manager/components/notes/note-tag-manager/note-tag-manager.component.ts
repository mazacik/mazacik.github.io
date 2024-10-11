import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { DragDropDirective } from 'src/app/shared/directives/dragdrop.directive';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StoryManagerGoogleDriveService } from 'src/app/story-manager/services/story-manager-google-drive.service';
import { StoryManagerStateService } from 'src/app/story-manager/services/story-manager-state.service';

@Component({
  selector: 'app-note-tag-manager',
  standalone: true,
  imports: [
    CommonModule,
    DragDropDirective
  ],
  templateUrl: './note-tag-manager.component.html',
  styleUrls: ['./note-tag-manager.component.scss']
})
export class NoteTagManagerComponent extends DialogContent<string[]> implements OnInit {

  @Input() tags: string[] = [];

  protected availableTags: string[];

  public configuration: DialogConfiguration = {
    title: 'Tag Manager',
    buttons: [{
      text: () => 'Cancel',
      click: () => this.close()
    }, {
      text: () => 'Save',
      click: () => this.submit()
    }]
  };

  constructor(
    private stateService: StoryManagerStateService,
    private dialogService: DialogService,
    private googleService: StoryManagerGoogleDriveService
  ) {
    super();
  }

  ngOnInit(): void {
    if (this.tags) {
      this.tags = this.tags.slice();
    } else {
      this.tags = [];
    }

    this.availableTags = this.stateService.tags.filter(tag => !this.tags.includes(tag));
  }

  protected add(tag: string): void {
    this.tags.push(tag);
    ArrayUtils.remove(this.availableTags, tag);

  }

  protected remove(tag: string): void {
    ArrayUtils.remove(this.tags, tag);
    this.availableTags.push(tag);
    this.availableTags.sort((t1, t2) => t1.localeCompare(t2));
  }

  protected editTag(tag?: string): void {
    this.dialogService.createInput('Tag', 'Tag Title', tag, 'OK').then(result => {
      if (!StringUtils.isEmpty(result)) {
        if (this.stateService.tags.includes(result)) return;
        if (tag) {
          if (result != tag) {
            if (this.tags.includes(tag)) {
              ArrayUtils.remove(this.tags, tag);
              this.tags.push(result);
              this.tags.sort((t1, t2) => t1.localeCompare(t2));
            } else {
              ArrayUtils.remove(this.availableTags, tag);
              this.availableTags.push(result);
              this.availableTags.sort((t1, t2) => t1.localeCompare(t2));
            }

            ArrayUtils.remove(this.stateService.tags, tag);
            this.stateService.tags.push(result);
            this.stateService.tags.sort((t1, t2) => t1.localeCompare(t2));
          }
        } else {
          this.availableTags.push(result);
          this.availableTags.sort((t1, t2) => t1.localeCompare(t2));
          this.stateService.tags.push(result);
          this.stateService.tags.sort((t1, t2) => t1.localeCompare(t2));
        }

        this.googleService.update(true);
      }
    });
  }

  protected deleteTag(tag: string): void {
    this.dialogService.createConfirmation('Delete', ['Are you sure you want to delete "' + tag + '"?'], 'Yes', 'No').then(result => {
      if (result) {
        if (this.tags.includes(tag)) {
          ArrayUtils.remove(this.tags, tag);
        } else {
          ArrayUtils.remove(this.availableTags, tag);
        }

        ArrayUtils.remove(this.stateService.tags, tag);
        this.googleService.update(true);
      }
    });
  }

  @HostListener('window:keydown.enter', ['$event'])
  submit(): void {
    this.resolve(this.tags);
  }

  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    this.resolve(null);
  }

}
