import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { TagUtils } from 'src/app/shared/utils/tag.utils';
import { Tag } from '../../model/tag.interface';
import { TagService } from '../../services/tag.service';

@Component({
  selector: 'app-gallery-tag-editor',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './gallery-tag-editor.component.html',
  styleUrls: ['./gallery-tag-editor.component.scss']
})
export class GalleryTagEditorComponent extends DialogContentBase<void> {

  public override inputs: { tag: Tag };

  public configuration: DialogContainerConfiguration = {
    title: () => 'Tag: ' + TagUtils.getCompleteName(this.inputs.tag),
    buttons: [{
      text: () => 'Cancel',
      click: () => this.close()
    }]
  };

  constructor(
    protected tagService: TagService
  ) {
    super();
  }

  protected renameTag(): void {
    this.tagService.openTagRename(this.inputs.tag);
    this.close();
  }

  protected deleteTag(): void {
    this.tagService.openTagDelete(this.inputs.tag);
    this.close();
  }

  protected changeTagParent(): void {
    this.tagService.openTagParentChange(this.inputs.tag);
    this.close();
  }

  protected createTagChild(): void {
    this.tagService.openTagCreate(this.inputs.tag);
    this.close();
  }

  public override submit(): void {

  }

  public close(): void {
    this.resolve();
  }

}
