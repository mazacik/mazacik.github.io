import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Tag } from 'src/app/gallery/models/tag.class';
import { GalleryImageFilter } from 'src/app/gallery/services/filter.service';
import { GallerySerializationService } from 'src/app/gallery/services/gallery-serialization.service';
import { GalleryStateService } from 'src/app/gallery/services/gallery-state.service';
import { GalleryService } from 'src/app/gallery/services/gallery.service';
import { TagService } from 'src/app/gallery/services/tag.service';

@Component({
    selector: 'app-filter-row',
    imports: [CommonModule],
    templateUrl: './filter-row.component.html',
    styleUrls: ['./filter-row.component.scss']
})
export class FilterRowComponent {

  @Input() tag: Tag;
  @Input({ required: true }) filter: GalleryImageFilter;
  @Input() showFullName: boolean = false;
  @Input() flatMode: boolean = false;
  constructor(
    private tagService: TagService,
    private serializationService: GallerySerializationService,
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) { }

  protected onTagClick(): void {
    if (this.tag.group && !this.flatMode) {
      this.tag.open = !this.tag.open;
    } else {
      this.activate();
    }
  }

  public activate(): void {
    const selection = this.filter.forTag(this.tag);
    selection.state = selection.state == 0 ? 1 : selection.state == 1 ? -1 : 0;
    this.filter.updateFilters();
    this.serializationService.save();
  }

  protected getGroupFilterLabel(): string {
    const selected = this.filter.forTag(this.tag).state;
    const state = selected === 1 ? 'included' : selected === -1 ? 'excluded' : 'neutral';
    const next = selected === 1 ? 'exclude' : selected === -1 ? 'clear filter for' : 'include';
    return `${this.tag.getNameWithParents()}: ${state}. Click to ${next} this group.`;
  }

  protected getTextClass(): string {
    const classes = [this.filter.forTag(this.tag).colorClass];

    if (this.tag.collectChildren().some(t => this.filter.forTag(t).state)) {
      classes.push('underline-dashed');
    }

    return classes.join(' ');
  }

  protected getDisplayName(): string {
    return this.showFullName
      ? this.tag.collectParents().concat(this.tag).reverse().map(tag => tag.name).join(' | ')
      : this.tag.name;
  }

  protected getTagGroups(): Tag[] {
    return this.tag.children.filter(t => t.group);
  }

  protected getTags(): Tag[] {
    return this.tag.children.filter(t => !t.group);
  }

  protected openOptions(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.galleryService.openTagOptions(this.tag);
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
