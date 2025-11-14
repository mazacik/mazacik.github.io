
import { Component, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DragDropDirective } from 'src/app/shared/directives/dragdrop.directive';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GalleryGroup } from '../../models/gallery-group.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { FilterService } from '../../services/filter.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';

@Component({
    selector: 'app-group-editor',
    imports: [
    DragDropDirective
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
        this.dialogService.createConfirmation({ title: 'Confirmation: Disband Image Group', messages: ['Are you sure you want to disband this group of images?'] }).then(success => {
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
    private filterService: FilterService,
    private serializationService: GallerySerializationService,
    protected stateService: GalleryStateService,
    protected dialogService: DialogService
  ) {
    super();
  }

  ngOnInit(): void {
    this.stateService.groupEditorGroup = { images: this.inputs.sourceGroup ? [...this.inputs.sourceGroup.images] : [] };
    this.filterService.updateFilters();
  }

  protected removeImage(image: GalleryImage): void {
    ArrayUtils.remove(this.stateService.groupEditorGroup.images, image);
  }

  private disband(): void {
    const group: GalleryGroup = this.inputs.sourceGroup;
    if (group) {
      ArrayUtils.remove(this.stateService.imageGroups, group);
      for (const groupImage of group.images) {
        delete groupImage.group;
      }

      this.serializationService.save(true);
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
        this.stateService.imageGroups.push(editorGroup);
        editorGroup.images.forEach(image => image.group = editorGroup);
      }

      this.serializationService.save(true);
      this.close();
    }
  }

  public close(): void {
    this.stateService.groupEditorGroup = null;
    this.filterService.updateFilters();
    this.resolve();
  }

}
