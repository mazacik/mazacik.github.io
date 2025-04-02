import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DragDropDirective } from 'src/app/shared/directives/dragdrop.directive';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GalleryGroup } from '../../model/gallery-group.class';
import { GalleryImage } from '../../model/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-group-editor',
  standalone: true,
  imports: [
    CommonModule,
    DragDropDirective
  ],
  templateUrl: './group-editor.component.html',
  styleUrls: ['./group-editor.component.scss']
})
export class GroupEditorComponent extends DialogContentBase<void> implements OnInit {

  public override inputs: { sourceGroup: GalleryGroup };

  public override configuration: DialogContainerConfiguration = {
    title: 'Group Editor',
    buttons: [{
      text: () => 'Disband',
      hidden: () => this.inputs.sourceGroup == null,
      click: () => this.disband()
    }, {
      text: () => 'Save',
      disabled: () => this.stateService.groupEditorGroup.images.length == 0,
      click: () => this.save()
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }],
    hideClickOverlay: true
  }

  constructor(
    protected stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.stateService.groupEditorGroup = { images: this.inputs.sourceGroup ? [...this.inputs.sourceGroup.images] : [] }
    this.stateService.updateFilters();
  }

  protected remove(image: GalleryImage): void {
    ArrayUtils.remove(this.stateService.groupEditorGroup.images, image);
  }

  private disband(): void {
    const group: GalleryGroup = this.inputs.sourceGroup;
    if (group) {
      ArrayUtils.remove(this.stateService.groups, group);
      for (const image of group.images) {
        image.group = null;
      }
    }
  }

  public save(): void {
    const sourceGroup: GalleryGroup = this.inputs.sourceGroup;
    const editorGroup: GalleryGroup = this.stateService.groupEditorGroup;
    if (editorGroup.images.length > 0) {
      if (sourceGroup) {
        sourceGroup.images.forEach(image => image.group = null);
        sourceGroup.images = [...editorGroup.images];
        sourceGroup.images.forEach(image => image.group = sourceGroup);
      } else {
        this.stateService.groups.push(editorGroup);
        editorGroup.images.forEach(image => image.group = editorGroup);
      }

      this.stateService.save();
      this.close();
    }
  }

  public close(): void {
    this.stateService.groupEditorGroup = null;
    this.stateService.updateFilters();
    this.resolve();
  }

}
