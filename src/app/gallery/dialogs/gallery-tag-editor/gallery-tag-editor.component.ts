import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { nanoid } from 'nanoid';
import { Tag } from 'src/app/gallery/model/tag.interface';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { TagGroup } from '../../model/tag-group.interface';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-gallery-tag-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './gallery-tag-editor.component.html',
  styleUrls: ['./gallery-tag-editor.component.scss'],
})
export class GalleryTagEditorComponent extends DialogContentBase<Tag> implements OnInit {

  public override inputs: { mode: 'create' | 'edit', group: TagGroup, tag: Tag };

  protected groupName: string;
  protected tagName: string;

  public configuration: DialogContainerConfiguration = {
    title: 'Tag Editor',
    buttons: [{
      text: () => 'Delete',
      hidden: () => this.inputs.mode == 'create',
      click: () => this.deleteTag()
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }, {
      text: () => {
        if (this.inputs.mode == 'create') {
          return 'Create';
        }

        if (this.inputs.group && this.inputs.tag && this.groupName == this.inputs.group.name && this.tagName == this.inputs.tag.name) {
          return 'Save'; // no changes, diabled
        }

        if (this.doesTagExistInGroup(this.tagName, this.groupName)) {
          return 'Merge';
        }

        return 'Save';
      },
      disabled: () => !this.canSubmit(),
      click: () => this.submit()
    }]
  };

  constructor(
    private dialogService: DialogService,
    protected stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    if (this.inputs.group) {
      this.groupName = this.inputs.group.name;
    }
    if (this.inputs.tag) {
      this.tagName = this.inputs.tag.name;
    }
  }

  protected deleteTag(): void {
    if (this.inputs.mode == 'edit') {
      if (this.inputs.tag == null) {
        this.dialogService.createConfirmation('Delete Tag Group', ['Delete tag group "' + this.inputs.group.name + '"?'], 'Yes', 'No').then(result => {
          if (result) {
            ArrayUtils.remove(this.stateService.tags, this.inputs.group.tags);
            ArrayUtils.remove(this.stateService.tagGroups, this.inputs.group);

            for (const image of this.stateService.images) {
              ArrayUtils.remove(image.tags, this.inputs.group.tags);
            }

            this.stateService.save();
            this.resolve(null);
          }
        });
      } else {
        this.dialogService.createConfirmation('Delete Tag', ['Delete tag "' + this.inputs.group.name + ' - ' + this.inputs.tag.name + '"?'], 'Yes', 'No').then(result => {
          if (result) {
            ArrayUtils.remove(this.stateService.tags, this.inputs.tag);
            ArrayUtils.remove(this.inputs.group.tags, this.inputs.tag);

            if (ArrayUtils.isEmpty(this.inputs.group.tags)) {
              ArrayUtils.remove(this.stateService.tagGroups, this.inputs.group);
            }

            for (const image of this.stateService.images) {
              ArrayUtils.remove(image.tags, this.inputs.tag);
              this.stateService.updateFilters(image);
            }

            this.stateService.save();
            this.resolve(null);
          }
        });
      }
    }
  }

  protected canSubmit(): boolean {
    if (this.inputs.mode == 'create') {
      // create new
      if (StringUtils.isEmpty(this.groupName)) {
        return false;
      }

      if (StringUtils.isEmpty(this.tagName)) {
        return false;
      }

      for (const group of this.stateService.tagGroups) {
        for (const tag of group.tags) {
          if (group.name == this.groupName && tag.name == this.tagName) {
            return false;
          }
        }
      }
    } else {
      // edit existing
      if (this.inputs.tag == null) {
        // group
        if (StringUtils.isEmpty(this.groupName)) {
          return false;
        }

        if (this.groupName == this.inputs.group.name) {
          return false;
        }

        for (const group of this.stateService.tagGroups) {
          if (group.name == this.groupName) {
            return false;
          }
        }
      } else {
        // tag
        if (StringUtils.isEmpty(this.groupName)) {
          return false;
        }

        if (StringUtils.isEmpty(this.tagName)) {
          return false;
        }

        if (this.inputs.group && this.inputs.tag && this.groupName == this.inputs.group.name && this.tagName == this.inputs.tag.name) {
          // no changes
          return false;
        }

        // for (const group of this.stateService.tagGroups) {
        //   for (const tag of group.tags) {
        //     if (group.name == this.groupName && tag.name == this.tagName) {
        //       return false;
        //     }
        //   }
        // }
      }
    }

    return true;
  }

  public override async submit(): Promise<void> {
    if (this.canSubmit()) {
      if (this.inputs.mode == 'create') {
        // create new
        let group: TagGroup = this.stateService.tagGroups.find(group => group.name == this.groupName);
        if (!group) {
          group = { name: this.groupName, tags: [] };
          this.stateService.tagGroups.push(group);
          this.stateService.tagGroups.sort((g1, g2) => g1.name.localeCompare(g2.name));
        }

        const tag: Tag = { id: nanoid(), name: this.tagName, state: 0 };
        group.tags.push(tag);
        group.tags.sort((t1, t2) => t1.name.localeCompare(t2.name));
        this.stateService.tags.push(tag);
        this.stateService.tags.sort((t1, t2) => t1.name.localeCompare(t2.name));
      } else {
        // edit existing
        if (this.inputs.tag == null) {
          // group rename (groups can't merge)
          this.inputs.group.name = this.groupName;
          this.stateService.tagGroups.sort((g1, g2) => g1.name.localeCompare(g2.name));
        } else {
          // check both
          let group: TagGroup = this.inputs.group;
          if (this.groupName != group.name) {
            // remove tag from old group
            ArrayUtils.remove(group.tags, this.inputs.tag);
            if (ArrayUtils.isEmpty(group.tags)) {
              ArrayUtils.remove(this.stateService.tagGroups, group);
            }

            // find new group, create it if not exists
            group = this.stateService.tagGroups.find(group => group.name == this.groupName);
            if (group == null) {
              group = { name: this.groupName, tags: [] };
              this.stateService.tagGroups.push(group);
              this.stateService.tagGroups.sort((g1, g2) => g1.name.localeCompare(g2.name));
            }

            // add tag to new group
            group.tags.push(this.inputs.tag);
            group.tags.sort((t1, t2) => t1.name.localeCompare(t2.name));
          }

          // rename/merge tag
          if (this.tagName != this.inputs.tag.name) {
            const destinationTag: Tag = this.stateService.tagGroups.find(tagGroup => tagGroup.name == this.groupName)?.tags.find(tag => tag.name == this.tagName);
            if (destinationTag) {
              // replace old tag with new tag on all images that have it
              for (const image of this.stateService.images) {
                if (image.tags.find(imageTag => imageTag.id == this.inputs.tag.id)) {
                  ArrayUtils.remove(image.tags, this.inputs.tag);

                  if (!image.tags.includes(destinationTag)) {
                    image.tags.push(destinationTag);
                  }
                }
              }

              // remove old tag from group
              ArrayUtils.remove(group.tags, this.inputs.tag);

              // remove old tag from tag list
              ArrayUtils.remove(this.stateService.tags, this.inputs.tag);
            } else {
              // rename tag
              this.inputs.tag.name = this.tagName;
              group.tags.sort((t1, t2) => t1.name.localeCompare(t2.name));
              this.stateService.tags.sort((t1, t2) => t1.name.localeCompare(t2.name));
            }
          }
        }
      }

      this.stateService.save();
      this.resolve(this.inputs.tag);
    }
  }

  private doesTagExistInGroup(tagName: string, groupName: string): boolean {
    return tagName && groupName && this.stateService.tagGroups.find(group => group.name == groupName)?.tags.some(tag => tag.name == tagName);
  }

  public close(): void {
    this.resolve(null);
  }

}
