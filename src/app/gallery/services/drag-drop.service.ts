import { Injectable } from '@angular/core';
import { Tag } from '../models/tag.class';
import { TagService } from './tag.service';

@Injectable({
  providedIn: 'root',
})
export class DragDropService {

  private instances = [];

  private startObject: Tag;

  public constructor(
    private tagService: TagService
  ) { }

  public register(): void {
    
  }

  public start(event: DragEvent, currentObject: Tag): void {
    console.log('dragstart: ' + currentObject.name);

    this.startObject = currentObject;
  }

  public enter(event: DragEvent, currentObject: Tag): void {
    console.log('dragenter: ' + currentObject.name);
  }

  public leave(event: DragEvent, currentObject: Tag): void {
    console.log('dragleave: ' + currentObject.name);
  }

  public drop(event: DragEvent, currentObject: Tag): void {
    console.log('drop: ' + currentObject.name);

    if (currentObject != this.startObject && currentObject.parent != this.startObject) {
      this.tagService.changeParent(this.startObject, currentObject.group ? currentObject : currentObject.parent);
    }
  }

  public end(event: DragEvent, currentObject: Tag): void {
    console.log('dragend: ' + currentObject.name);
  }

}
