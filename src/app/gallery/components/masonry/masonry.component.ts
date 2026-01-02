import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Delay } from 'src/app/shared/classes/delay.class';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GalleryGroup } from '../../models/gallery-group.class';
import { FilterService } from '../../services/filter.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';
import { ApplicationService } from 'src/app/shared/services/application.service';

@Component({
  selector: 'app-masonry',
  imports: [
    CommonModule,
    CreateDirective
  ],
  templateUrl: './masonry.component.html',
  styleUrls: ['./masonry.component.scss']
})
export class MasonryComponent implements OnInit, OnDestroy {

  protected masonryBricks: { [key: string]: HTMLImageElement } = {};
  protected masonryContainer: HTMLElement;
  protected masonryScrollContainer: HTMLElement;

  constructor(
    elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private applicationService: ApplicationService,
    protected tagService: TagService,
    protected filterService: FilterService,
    protected stateService: GalleryStateService,
    protected galleryService: GalleryService
  ) {
    effect(() => this.updateLayout(this.filterService.masonryImages()));

    new ResizeObserver(() => {
      if (ScreenUtils.isLargeScreen()) {
        this.requestLayoutUpdate();
      }
    }).observe(elementRef.nativeElement);
  }

  ngOnInit(): void {
    this.applicationService.addHeaderButtons('start', [{
      id: 'toggle-filter',
      tooltip: 'Open Filter Configuration',
      classes: ['fa-solid', 'fa-filter'],
      hidden: () => this.stateService.viewMode !== 'masonry' || !!this.stateService.fullscreenImage(),
      containerClasses: () => ({
        'drawer-container': true,
        'drawer-hidden': !this.stateService.filterVisible
      }),
      onClick: () => this.stateService.filterVisible = !this.stateService.filterVisible
    }]);

    this.applicationService.addHeaderButtons('center', [{
      id: 'create-group',
      tooltip: 'Create Image Group',
      classes: ['fa-solid', 'fa-folder-plus'],
      hidden: () => this.stateService.viewMode !== 'masonry' || !!this.stateService.fullscreenImage(),
      onClick: () => this.galleryService.openImageGroupEditor()
    }]);
  }

  ngOnDestroy(): void {
    this.applicationService.removeHeaderButtons('start', ['toggle-filter']);
    this.applicationService.removeHeaderButtons('center', ['create-group']);
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

  protected updateLayout(images: GalleryImage[] = this.filterService.masonryImages()): void {
    if (this.masonryContainer && !ArrayUtils.isEmpty(images)) {
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
