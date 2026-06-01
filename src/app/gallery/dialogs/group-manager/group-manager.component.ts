
import { Component, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { DragDropDirective } from 'src/app/shared/directives/dragdrop.directive';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { SortState } from 'src/app/shared/classes/binary-insertion-sort.class';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GalleryGroup } from '../../models/gallery-group.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { FilterService } from '../../services/filter.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';

@Component({
  selector: 'app-group-manager',
  imports: [
    DragDropDirective
  ],
  templateUrl: './group-manager.component.html',
  styleUrls: ['./group-manager.component.scss']
})
export class GroupManagerComponent extends DialogContentBase<void, {}> implements OnInit {

  public override inputs: { sourceGroup: GalleryGroup };

  public override configuration: DialogContainerConfiguration = {
    title: 'Image Group Manager',
    headerButtons: [{
      iconClass: 'fa-solid fa-times',
      click: () => this.close()
    }],
    footerButtons: [{
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
    this.stateService.groupEditorGroup = { id: this.inputs.sourceGroup?.id, images: this.inputs.sourceGroup ? [...this.inputs.sourceGroup.images] : [] };
    this.filterService.updateFilters();
  }

  protected removeImage(image: GalleryImage): void {
    ArrayUtils.remove(this.stateService.groupEditorGroup.images, image);
  }

  private disband(): void {
    const group: GalleryGroup = this.inputs.sourceGroup;
    if (group) {
      const previousImages = [...group.images];
      ArrayUtils.remove(this.stateService.imageGroups, group);
      for (const groupImage of group.images) {
        delete groupImage.group;
      }

      this.reconcileGroupSortState(previousImages, [], group.id);
      this.serializationService.save(true);
      this.close();
    }
  }

  public override submit(): void {
    const sourceGroup: GalleryGroup = this.inputs.sourceGroup;
    const editorGroup: GalleryGroup = this.stateService.groupEditorGroup;
    if (editorGroup.images.length > 0) {
      const previousImages = sourceGroup ? [...sourceGroup.images] : [];
      const groupId = sourceGroup?.id ?? this.serializationService.createGroupId();

      if (sourceGroup) {
        sourceGroup.images.forEach(image => image.group = null);
        sourceGroup.images = [...editorGroup.images];
        sourceGroup.images.forEach(image => image.group = sourceGroup);
      } else {
        editorGroup.id = groupId;
        this.stateService.imageGroups.push(editorGroup);
        editorGroup.images.forEach(image => image.group = editorGroup);
      }

      this.reconcileGroupSortState(previousImages, [...editorGroup.images], groupId);
      this.serializationService.save(true);
      this.close();
    }
  }

  public close(): void {
    this.stateService.groupEditorGroup = null;
    this.filterService.updateFilters();
    this.resolve();
  }

  private reconcileGroupSortState(previousImages: GalleryImage[], nextImages: GalleryImage[], groupId: string): void {
    const currentState = this.stateService.imageSort.getState();
    const nextSubjectIds = GallerySortUtils.getSortableSubjectIds(this.stateService.images, this.stateService.imageGroups);
    const nextSubjectSet = new Set(nextSubjectIds);
    const previousImageSubjects = previousImages.map(image => GallerySortUtils.imageSubjectId(image.id));
    const nextImageSubjects = nextImages.map(image => GallerySortUtils.imageSubjectId(image.id));
    const removedImageSubjects = previousImageSubjects.filter(subjectId => !nextImageSubjects.includes(subjectId));
    const addedImageSubjects = nextImageSubjects.filter(subjectId => !previousImageSubjects.includes(subjectId));
    const groupSubjectId = GallerySortUtils.groupSubjectId(groupId);
    const groupRankSourceId = this.getGroupRankSourceId(currentState, previousImages, nextImages, addedImageSubjects, groupSubjectId);
    const droppedSubjectIds = new Set<string>([...nextImageSubjects, ...removedImageSubjects]);
    const forcePendingSubjectIds = new Set<string>(removedImageSubjects);

    if (!nextImages.length) {
      previousImageSubjects.forEach(subjectId => forcePendingSubjectIds.add(subjectId));
      droppedSubjectIds.add(groupSubjectId);
    } else if (groupRankSourceId !== groupSubjectId) {
      droppedSubjectIds.add(groupSubjectId);
    }

    if (nextImages.length && !groupRankSourceId) {
      forcePendingSubjectIds.add(groupSubjectId);
    }

    const rankedImageIds: string[] = [];
    for (const subjectId of currentState.rankedImageIds) {
      const replacementSubjectId = subjectId === groupRankSourceId ? groupSubjectId : subjectId;
      if (rankedImageIds.includes(replacementSubjectId)) {
        continue;
      }

      if (subjectId === groupRankSourceId && nextSubjectSet.has(groupSubjectId)) {
        rankedImageIds.push(groupSubjectId);
        continue;
      }

      if (!droppedSubjectIds.has(subjectId) && nextSubjectSet.has(subjectId)) {
        rankedImageIds.push(subjectId);
      }
    }

    const pendingImageIds = currentState.pendingImageIds
      .filter(subjectId => !droppedSubjectIds.has(subjectId) && nextSubjectSet.has(subjectId));
    forcePendingSubjectIds.forEach(subjectId => {
      if (nextSubjectSet.has(subjectId) && !rankedImageIds.includes(subjectId) && !pendingImageIds.includes(subjectId)) {
        pendingImageIds.push(subjectId);
      }
    });

    const activeInsertion = currentState.activeInsertion
      && nextSubjectSet.has(currentState.activeInsertion.imageId)
      && !droppedSubjectIds.has(currentState.activeInsertion.imageId)
      ? { ...currentState.activeInsertion }
      : null;

    const nextState: SortState = {
      rankedImageIds,
      pendingImageIds,
      activeInsertion
    };

    this.stateService.imageSort.start(
      nextSubjectIds,
      nextState
    );
    this.stateService.sortState = this.stateService.imageSort.getState();
  }

  private getGroupRankSourceId(
    currentState: SortState,
    previousImages: GalleryImage[],
    nextImages: GalleryImage[],
    addedImageSubjects: string[],
    groupSubjectId: string
  ): string | null {
    if (!nextImages.length) {
      return null;
    }

    const rankedSubjectIds = new Set(currentState.rankedImageIds);
    const firstNextImageSubjectId = GallerySortUtils.imageSubjectId(nextImages[0].id);
    const firstImageWasAdded = addedImageSubjects.includes(firstNextImageSubjectId);
    if (previousImages.length && firstImageWasAdded) {
      return rankedSubjectIds.has(firstNextImageSubjectId) ? firstNextImageSubjectId : null;
    }

    if (previousImages.length && rankedSubjectIds.has(groupSubjectId)) {
      return groupSubjectId;
    }

    for (const image of nextImages) {
      const subjectId = GallerySortUtils.imageSubjectId(image.id);
      if (rankedSubjectIds.has(subjectId)) {
        return subjectId;
      }
    }

    return rankedSubjectIds.has(groupSubjectId) ? groupSubjectId : null;
  }

}
