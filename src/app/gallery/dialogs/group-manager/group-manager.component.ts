import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DragDropDirective } from 'src/app/shared/directives/dragdrop.directive';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GalleryGroup } from '../../model/gallery-group.class';
import { GalleryImage } from '../../model/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-group-editor',
  standalone: true,
  imports: [
    CommonModule,
    DragDropDirective,
    TippyDirective
  ],
  templateUrl: './group-manager.component.html',
  styleUrls: ['./group-manager.component.scss']
})
export class GroupManagerComponent extends DialogContentBase<void, {}> implements OnInit {

  public override inputs: { sourceGroup: GalleryGroup };

  public override configuration: DialogContainerConfiguration = {
    title: 'Group Manager',
    buttons: [{
      text: () => 'Disband',
      hidden: () => this.inputs.sourceGroup == null,
      click: () => {
        this.dialogService.createConfirmation('Confirmation', ['Are you sure you want to disband this group of images?'], 'Yes', 'No').then(success => {
          if (success) {
            this.disband();
          }
        });
      }
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }, {
      text: () => 'Save',
      disabled: () => this.stateService.groupEditorGroup.images.length < 2,
      click: () => this.submit()
    }],
    hideClickOverlay: true
  }

  constructor(
    protected stateService: GalleryStateService,
    protected dialogService: DialogService
  ) {
    super();
  }

  ngOnInit(): void {
    this.stateService.groupEditorGroup = { images: this.inputs.sourceGroup ? [...this.inputs.sourceGroup.images] : [] };
    this.stateService.updateFilters();
  }

  protected removeImage(image: GalleryImage): void {
    ArrayUtils.remove(this.stateService.groupEditorGroup.images, image);
  }

  private disband(): void {
    const group: GalleryGroup = this.inputs.sourceGroup;
    if (group) {
      ArrayUtils.remove(this.stateService.groups, group);
      for (const groupImage of group.images) {
        delete groupImage.group;
      }

      this.stateService.save(true);
      this.close();
    }
  }

  public override submit(): void {
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

      this.stateService.save(true);
      this.close();
    }
  }

  public close(): void {
    this.stateService.groupEditorGroup = null;
    this.stateService.updateFilters();
    this.resolve();
  }

}
