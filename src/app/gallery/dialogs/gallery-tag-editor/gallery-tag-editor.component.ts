import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tag } from 'src/app/gallery/model/tag.interface';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
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

  public override inputs: { tag?: Tag, tagName?: string };

  public configuration: DialogContainerConfiguration = {
    title: 'Tag Editor',
    buttons: [{
      text: () => 'Delete',
      hidden: () => this.inputs.tag == null,
      click: () => this.deleteTag()
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }, {
      text: () => this.inputs.tag ? 'Save' : 'Create',
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
    if (this.inputs.tag) this.inputs.tagName = this.inputs.tag.name;
  }

  protected deleteTag(): void {
    if (this.inputs.tag) {
      this.dialogService.createConfirmation('Delete Tag', ['Are you sure you want to delete tag "' + this.inputs.tag.name + '"?'], 'Yes', 'No').then(result => {
        if (result) {
          for (const image of this.stateService.images) {
            ArrayUtils.remove(image.tags, this.inputs.tag.name);
          }

          ArrayUtils.remove(this.stateService.tags, this.inputs.tag);

          this.stateService.save();
          this.resolve(null);
        }
      });
    }
  }

  protected canSubmit(): boolean {
    if (StringUtils.isEmpty(this.inputs.tagName)) {
      return false;
    }

    if (this.inputs.tag && this.inputs.tagName == this.inputs.tag.name) {
      return true;
    }

    return this.stateService.tags.find(tag => this.inputs.tagName == tag.name) == null;
  }

  public override submit(): void {
    if (this.canSubmit()) {
      if (!this.inputs.tag) {
        this.inputs.tag = {
          name: this.inputs.tagName,
          state: 0
        };

        this.stateService.tags.push(this.inputs.tag);
      } else {
        this.inputs.tag.name = this.inputs.tagName;
      }

      this.stateService.tags.sort((tag1, tag2) => tag1.name.localeCompare(tag2.name));
      this.stateService.save();

      this.resolve(this.inputs.tag);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
