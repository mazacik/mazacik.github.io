import { Injectable } from '@angular/core';
import { Tag } from '../models/tag.class';
import { TagService } from './tag.service';

@Injectable({
  providedIn: 'root',
})
export class TagDragDropService {

  // TODO indicator CSS

  private dragStartTag: Tag;

  public constructor(
    private tagService: TagService
  ) { }

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
      this.tagService.moveTagToParent(this.dragStartTag, currentTag.group ? currentTag : currentTag.parent);
    }
  }

  public dragEnd(event: DragEvent, currentTag: Tag): void {
    console.log('dragend: ' + currentTag.name);
  }

}
