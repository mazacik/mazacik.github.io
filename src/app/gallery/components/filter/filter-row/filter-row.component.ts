import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Tag } from 'src/app/gallery/models/tag.class';
import { FilterService } from 'src/app/gallery/services/filter.service';
import { GallerySerializationService } from 'src/app/gallery/services/gallery-serialization.service';
import { GalleryStateService } from 'src/app/gallery/services/gallery-state.service';
import { GalleryService } from 'src/app/gallery/services/gallery.service';
import { TagService } from 'src/app/gallery/services/tag.service';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';

@Component({
    selector: 'app-filter-row',
    imports: [CommonModule, VariableDirective],
    templateUrl: './filter-row.component.html',
    styleUrls: ['./filter-row.component.scss']
})
export class FilterRowComponent {

  @Input() tag: Tag;

  constructor(
    private tagService: TagService,
    private filterService: FilterService,
    private serializationService: GallerySerializationService,
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) { }

  protected onTagClick(): void {
    if (this.tag.group) {
      this.tag.open = !this.tag.open;
    } else {
      this.toggleTagState();
    }
  }

  protected toggleTagState(): void {
    this.tag.state = this.tag.state == 0 ? 1 : this.tag.state == 1 ? -1 : 0;
    this.filterService.updateFilters();
    this.serializationService.save();
  }

  protected getTextClass(): string {
    const classes: string[] = [];

    if (this.tag.state == 1) {
      classes.push('positive');
    } else if (this.tag.state == -1) {
      classes.push('negative');
    }

    if (this.tag.collectChildren().some(t => t.state)) {
      classes.push('underline-dashed');
    }

    return classes.join(' ');
  }

  protected getTagGroups(): Tag[] {
    return this.tag.children.filter(t => t.group);
  }

  protected getTags(): Tag[] {
    return this.tag.children.filter(t => !t.group);
  }

  // 

  private static startObject: Tag;

  public start(event: DragEvent, currentObject: Tag): void {
    console.log('start: ' + currentObject.name);

    FilterRowComponent.startObject = currentObject;
  }

  public enter(event: DragEvent, currentObject: Tag): void {
    console.log('enter: ' + currentObject.name);
  }

  public leave(event: DragEvent, currentObject: Tag): void {
    console.log('leave: ' + currentObject.name);
  }

  public drop(event: DragEvent, currentObject: Tag): void {
    console.log('drop: ' + currentObject.name);

    if (currentObject != FilterRowComponent.startObject && currentObject.parent != FilterRowComponent.startObject) {
      this.tagService.changeParent(FilterRowComponent.startObject, currentObject.group ? currentObject : currentObject.parent);
    }
  }

  public end(event: DragEvent, currentObject: Tag): void {
    console.log('end: ' + currentObject.name);
  }

}
