import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TagGroup } from 'src/app/gallery/model/tag-group.interface';
import { GalleryGoogleDriveService } from 'src/app/gallery/services/gallery-google-drive.service';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-gallery-tag-group-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './gallery-tag-group-editor.component.html',
  styleUrls: ['./gallery-tag-group-editor.component.scss'],
})
export class GalleryTagGroupEditorComponent extends DialogContent<TagGroup> implements OnInit {

  @Input() protected group: TagGroup;

  protected groupName: string;

  protected canDelete: boolean;

  public configuration: DialogConfiguration = {
    title: 'Tag Group Editor',
    buttons: [{
      text: () => this.group.name.length > 0 ? 'Save' : 'Create',
      disable: () => !this.canSubmit(),
      click: () => this.submit()
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }, {
      text: () => 'Delete',
      hidden: () => !this.canDelete,
      click: () => this.deleteGroup()
    }]
  };

  constructor(
    private dialogService: DialogService,
    private googleService: GalleryGoogleDriveService,
    private stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    if (!this.group) this.group = { name: '', state: 0, tags: [] };
    this.groupName = this.group.name;
    this.canDelete = this.stateService.tagGroups.includes(this.group);
  }

  protected deleteGroup(): void {
    if (this.canDelete) {
      this.dialogService.createConfirmation('Delete Group', ['Do you really want to delete tag group "' + this.group.name + '"?'], 'Yes', 'No').then(result => {
        if (result) {
          const tagIds: string[] = this.group.tags.map(tag => tag.id);

          for (const image of this.stateService.images) {
            ArrayUtils.remove(image.tags, tagIds);
          }

          this.googleService.updateData();
          this.resolve(null);
        }
      });
    }
  }

  protected canSubmit(): boolean {
    if (StringUtils.isEmpty(this.groupName)) {
      return false;
    }

    if (this.groupName == this.group.name) {
      return true;
    }

    return this.stateService.tagGroups.find(group => this.groupName == group.name) == null;
  }

  @HostListener('window:keydown.enter', ['$event'])
  protected submit(): void {
    if (this.canSubmit()) {
      this.group.name = this.groupName;

      if (!this.stateService.tagGroups.includes(this.group)) {
        this.stateService.tagGroups.push(this.group);
      }

      this.stateService.tagGroups.sort((group1, group2) => group1.name.localeCompare(group2.name));
      this.googleService.updateData();
      this.resolve(this.group);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
