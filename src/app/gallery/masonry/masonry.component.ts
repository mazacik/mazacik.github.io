import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, effect } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { GalleryImage } from 'src/app/gallery/model/gallery-image.class';
import { Delay } from 'src/app/shared/classes/delay.class';
import { fade } from 'src/app/shared/constants/animations.constants';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ScreenUtils } from '../../shared/utils/screen.utils';
import { GalleryService } from '../gallery.service';
import { HeaderComponent } from '../header/header.component';
import { GalleryGroup } from '../model/gallery-group.class';
import { GalleryGoogleDriveService } from '../services/gallery-google-drive.service';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-masonry',
  standalone: true,
  imports: [
    CommonModule,
    CreateDirective,
    TippyDirective,
    HeaderComponent
  ],
  templateUrl: './masonry.component.html',
  styleUrls: ['./masonry.component.scss'],
  animations: [fade]
})
export class MasonryComponent {

  protected bricks: { [key: string]: HTMLImageElement } = {};
  protected masonryContainer: HTMLElement;
  protected masonryScrollContainer: HTMLElement;

  protected masonryImages: GalleryImage[];

  constructor(
    elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    protected googleService: GalleryGoogleDriveService,
    protected galleryService: GalleryService
  ) {
    effect(() => this.updateLayout());
    // effect(() => this.scrollTo(this.stateService.target()));
    new ResizeObserver(() => this.requestLayoutUpdate()).observe(elementRef.nativeElement);
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
      this.masonryImages = this.stateService.filter().filter(image => {
        if (image.group) {
          return image == image.group.images.find(groupImage => groupImage.passesFilter);
        } else {
          return true;
        }
      });

      if (this.masonryImages.length == 0) return;

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

      for (const image of this.masonryImages) {
        if (image.masonryWidth != columnWidth) {
          image.masonryWidth = columnWidth;
          image.masonryHeight = columnWidth / image.aspectRatio;
        }

        const shortestColumnIndex: number = this.getShortestColumnIndex(columnsTop);
        image.masonryTop = columnsTop[shortestColumnIndex];
        image.masonryLeft = columnsLeft[shortestColumnIndex];
        columnsTop[shortestColumnIndex] = columnsTop[shortestColumnIndex] + image.masonryHeight + masonryGap;
      }
    }
  }

  private getShortestColumnIndex(columns: number[]): number {
    return columns.indexOf(Math.min(...columns));
  }

  private scrollTo(image: GalleryImage): void {
    if (image) {
      const targetRepresent: GalleryImage = image.group ? image.group.images.find(groupImage => groupImage.passesFilter) : image;
      const brickElement: HTMLImageElement = this.bricks[targetRepresent?.id];
      brickElement.scrollIntoView();
      // if (brickElement && !ScreenUtils.isElementVisible(brickElement)) {
      //   const containerElement: HTMLElement = document.getElementsByClassName('masonry-scroll-container')[0] as HTMLElement;
      //   const position: number = targetRepresent.top - (containerElement.clientHeight - brickElement.height) / 2;
      //   // scrollIntoView is bugged on Chrome when scrolling multiple elements at once (masonry+sidebar)
      //   containerElement.scrollTo({ top: position, behavior: 'smooth' });
      // }
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

    this.stateService.target.set(image);
  }

  protected areBrickButtonsVisible(): boolean {
    return ScreenUtils.isLargeScreen() && !this.stateService.groupEditorGroup;
  }

}
