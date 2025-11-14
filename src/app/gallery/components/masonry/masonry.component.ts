import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Delay } from 'src/app/shared/classes/delay.class';
import { fade } from 'src/app/shared/constants/animations.constants';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GalleryGroup } from '../../models/gallery-group.class';
import { FilterService } from '../../services/filter.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';
import { HeaderComponent } from '../header/header.component';

@Component({
    selector: 'app-masonry',
    imports: [
        CommonModule,
        CreateDirective,
        HeaderComponent
    ],
    templateUrl: './masonry.component.html',
    styleUrls: ['./masonry.component.scss'],
    animations: [fade]
})
export class MasonryComponent {

  protected masonryBricks: { [key: string]: HTMLImageElement } = {};
  protected masonryContainer: HTMLElement;
  protected masonryScrollContainer: HTMLElement;

  constructor(
    elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    protected tagService: TagService,
    protected filterService: FilterService,
    protected stateService: GalleryStateService,
    protected galleryService: GalleryService
  ) {
    effect(() => this.updateLayout());
    // effect(() => this.scrollTo(this.stateService.target()));
    new ResizeObserver(() => {
      if (ScreenUtils.isLargeScreen()) {
        this.requestLayoutUpdate();
      }
    }).observe(elementRef.nativeElement);
  }

  private layoutUpdateDelay: Delay = new Delay(100);
  private requestLayoutUpdate(): void {
    this.layoutUpdateDelay.restart(() => {
      const position: number = this.masonryScrollContainer.scrollTop / (this.masonryScrollContainer.scrollHeight - this.masonryScrollContainer.clientHeight);
      this.updateLayout();
      const top: number = (this.masonryScrollContainer.scrollHeight - this.masonryScrollContainer.clientHeight) * position;
      setTimeout(() => this.masonryScrollContainer.scrollTo({ top: top, behavior: 'smooth' }), 500);
      this.cdr.detectChanges();
    });
  }

  protected updateLayout(): void {
    if (this.masonryContainer) {
      if (this.filterService.masonryImages().length == 0) return;

      const minColumnWidth: number = ScreenUtils.isLargeScreen() ? 250 : 200;
      const masonryGap: number = ScreenUtils.isLargeScreen() ? 9.6666666666 : 4.3333333333;

      const containerWidth: number = this.masonryContainer.clientWidth;
      const columnCount: number = Math.max(Math.floor(containerWidth / minColumnWidth), 2);
      const columnWidth: number = (containerWidth - masonryGap * (columnCount - 1)) / columnCount;

      const columnsTop: number[] = [];
      const columnsLeft: number[] = [];
      for (let i = 0; i < columnCount; i++) {
        columnsTop[i] = 0;
        columnsLeft[i] = i * (columnWidth + masonryGap);
      }

      for (const image of this.filterService.masonryImages()) {
        if (image.masonryWidth != columnWidth) {
          image.masonryWidth = columnWidth;
          image.masonryHeight = columnWidth / image.aspectRatio;
        }

        const shortestColumnIndex: number = columnsTop.indexOf(Math.min(...columnsTop));
        image.masonryTop = columnsTop[shortestColumnIndex];
        image.masonryLeft = columnsLeft[shortestColumnIndex];
        columnsTop[shortestColumnIndex] = columnsTop[shortestColumnIndex] + image.masonryHeight + masonryGap;
      }
    }
  }

  private scrollTo(image: GalleryImage): void {
    if (image) {
      const targetRepresent: GalleryImage = image.group ? image.group.images.find(groupImage => groupImage.passesFilters) : image;
      const brickElement: HTMLImageElement = this.masonryBricks[targetRepresent?.id];
      brickElement.scrollIntoView();
    }
  }

  protected onImageClick(image: GalleryImage): void {
    const groupEditorGroup: GalleryGroup = this.stateService.groupEditorGroup;
    if (groupEditorGroup) {
      if (image.group && groupEditorGroup != image.group) {
        return;
      }

      // TODO check if editor out of bounds
      ArrayUtils.toggle(groupEditorGroup.images, image);
      return;
    }

    this.stateService.fullscreenImage.set(image);
  }

  protected areBrickButtonsVisible(): boolean {
    return ScreenUtils.isLargeScreen() && !this.stateService.groupEditorGroup;
  }

}
