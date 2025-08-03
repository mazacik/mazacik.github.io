import { Injectable } from '@angular/core';
import { ArrayUtils } from '../../shared/utils/array.utils';
import { Tag } from '../models/tag.class';
import { GalleryStateService } from './gallery-state.service';

@Injectable({
  providedIn: 'root',
})
export class TagDragDropService {

  // TODO indicator CSS

  private dragStartTag: Tag;

  public constructor(private stateService: GalleryStateService) { }

  public dragStart(event: DragEvent, currentTag: Tag): void {
    console.log('dragstart: ' + currentTag.name);
    this.dragStartTag = currentTag;
  }

  public dragEnter(event: DragEvent, currentTag: Tag): void {
    console.log('dragenter: ' + currentTag.name);
  }

  public dragLeave(event: DragEvent, currentTag: Tag): void {
    console.log('dragleave: ' + currentTag.name);
  }

  public dragDrop(event: DragEvent, currentTag: Tag): void {
    console.log('drop: ' + currentTag.name);

    if (currentTag != this.dragStartTag && currentTag.parent != this.dragStartTag) {
      if (!currentTag.group) {
        currentTag = currentTag.parent;
      }

      ArrayUtils.remove(this.dragStartTag.parent?.children, this.dragStartTag);

      this.dragStartTag.parent = currentTag;
      this.dragStartTag.parent.open = true;

      ArrayUtils.push(currentTag.children, this.dragStartTag);
      currentTag.sortChildren();

      for (const image of this.stateService.images) {
        if (image.tags.includes(this.dragStartTag)) {
          this.stateService.updateFilters(image);
        }
      }

      this.stateService.save();
    }
  }

  public dragEnd(event: DragEvent, currentTag: Tag): void {
    console.log('dragend: ' + currentTag.name);
  }

}
