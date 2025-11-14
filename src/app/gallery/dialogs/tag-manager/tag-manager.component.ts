
import { Component } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { Tag } from '../../models/tag.class';
import { GalleryStateService } from '../../services/gallery-state.service';
import { TagService } from '../../services/tag.service';

@Component({
  selector: 'app-tag-manager',
  templateUrl: './tag-manager.component.html',
  styleUrls: ['./tag-manager.component.scss']
})
export class TagManagerComponent extends DialogContentBase<void> {

  public override inputs: { tag: Tag };

  public configuration: DialogContainerConfiguration = {
    title: () => 'Tag: ' + this.inputs.tag.getNameWithParents(),
    buttons: [{
      text: () => 'Cancel',
      click: () => this.close()
    }]
  };

  constructor(
    protected tagService: TagService,
    protected stateService: GalleryStateService
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

  protected createTag(): void {
    this.tagService.openTagCreate(this.inputs.tag);
    this.close();
  }

  protected createTagGroup(): void {
    this.tagService.openTagGroupCreate(this.inputs.tag);
    this.close();
  }

  protected getPseudoListEditDisabledMessage(): string {
    if (this.stateService.images.some(image => image.tags.includes(this.inputs.tag))) {
      return 'Disabled: Tag is in use';
    }

    const parentPseudoTags: Tag[] = this.tagService.getParentPseudoTags(this.inputs.tag);
    if (parentPseudoTags.length == 0) return null;
    return `Disabled: Tag is in a pseudo list of '${parentPseudoTags.map(t => t.getNameWithParents()).join('; ')}'`;
  }

  protected isEditPseudoListDisabled(): boolean {
    if (this.stateService.images.some(image => image.tags.includes(this.inputs.tag))) return true;
    if (this.tagService.getParentPseudoTags(this.inputs.tag).length) return true;
    return false;
  }

  protected editPseudoList(): void {
    this.tagService.editPseudoList(this.inputs.tag);
    this.close();
  }

  protected insertTagGroup(): void {
    this.tagService.insertTagGroup(this.inputs.tag);
    this.close();
  }

  public close(): void {
    this.resolve();
  }

}
