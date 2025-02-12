import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, effect } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { GalleryImage } from 'src/app/gallery/model/gallery-image.class';
import { fade } from 'src/app/shared/constants/animations.constants';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ScreenUtils } from '../../shared/utils/screen.utils';
import { GalleryService } from '../gallery.service';
import { HeaderComponent } from '../header/header.component';
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

  private bricks: { [key: string]: HTMLImageElement } = {};
  private masonryContainer: HTMLElement;

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    protected googleService: GalleryGoogleDriveService,
    protected galleryService: GalleryService
  ) {
    effect(() => this.updateLayout());
    effect(() => this.scrollTo(this.stateService.target()));
    effect(() => this.updateMasonryTargetReference());
  }

  private updateLayout(): void {
    if (this.masonryContainer) {
      this.stateService.masonryImages = this.stateService.filter().filter(image => {
        if (image.group) {
          if (image.group.open) {
            return true;
          } else {
            return image == image.group.images.filter(groupImage => groupImage.passesFilter)[0];
          }
        } else {
          return true;
        }
      });

      if (this.stateService.masonryImages.length == 0) return;

      const minColumnWidth: number = ScreenUtils.isLargeScreen() ? 200 : 150;
      const masonryGap: number = 6;

      const containerWidth: number = this.masonryContainer.clientWidth;
      const columnCount: number = Math.floor(containerWidth / minColumnWidth);
      const columnWidth: number = (containerWidth - masonryGap * (columnCount - 1)) / columnCount;

      const top: number[] = [];
      const left: number[] = [];
      for (let i = 0; i < columnCount; i++) {
        top[i] = 0;
        left[i] = i * (columnWidth + masonryGap);
      }

      for (const image of this.stateService.masonryImages) {
        if (image.width != columnWidth) {
          image.width = columnWidth;
          image.height = columnWidth / image.aspectRatio;
        }
      }

      for (const image of this.stateService.masonryImages) {
        if (image.group?.open) {
          if (image == image.group.images.filter(image => image.passesFilter)[0]) {
            const groupColumnIndexes: number[] = [this.getShortestColumnIndex(top)];
            const groupColumnSpans: { top: number, bottom: number }[] = [];
            for (let i = 0; i < columnCount; i++) groupColumnSpans.push({ top: 0, bottom: 0 });

            for (const groupImage of image.group.images.filter(groupImage => groupImage.passesFilter)) {
              const availableColumnIndexes: number[] = [...groupColumnIndexes];

              const leftColumnIndex: number = Math.min(...groupColumnIndexes);
              if (leftColumnIndex > 0) {
                const imageMidpointIfExpandLeft: number = top[leftColumnIndex - 1] + groupImage.height * 0.5;
                if (imageMidpointIfExpandLeft > groupColumnSpans[leftColumnIndex].top && imageMidpointIfExpandLeft < groupColumnSpans[leftColumnIndex].bottom) {
                  availableColumnIndexes.push(leftColumnIndex - 1);
                }
              }

              const rightColumnIndex: number = Math.max(...groupColumnIndexes);
              if (rightColumnIndex < columnCount - 1) {
                const imageMidpointIfExpandRight: number = top[rightColumnIndex + 1] + groupImage.height * 0.5;
                if (imageMidpointIfExpandRight > groupColumnSpans[rightColumnIndex].top && imageMidpointIfExpandRight < groupColumnSpans[rightColumnIndex].bottom) {
                  availableColumnIndexes.push(rightColumnIndex + 1);
                }
              }

              const chosenColumnIndex: number = this.getShortestColumnIndex(top.map((columnTop, columnIndex) => availableColumnIndexes.includes(columnIndex) ? columnTop : 999999999));
              ArrayUtils.push(groupColumnIndexes, chosenColumnIndex);

              groupImage.top = top[chosenColumnIndex];
              groupImage.left = left[chosenColumnIndex];

              top[chosenColumnIndex] += groupImage.height + masonryGap;

              if (groupColumnSpans[chosenColumnIndex].top == 0) {
                groupColumnSpans[chosenColumnIndex].top = groupImage.top;
                groupColumnSpans[chosenColumnIndex].bottom = groupImage.top + groupImage.height;
              } else {
                groupColumnSpans[chosenColumnIndex].bottom += masonryGap + groupImage.height;
              }
            }
          }
        } else {
          const shortestColumnIndex: number = this.getShortestColumnIndex(top);
          image.top = top[shortestColumnIndex];
          image.left = left[shortestColumnIndex];
          top[shortestColumnIndex] = top[shortestColumnIndex] + image.height + masonryGap;
        }
      }
    }
  }

  private scrollTo(image: GalleryImage): void {
    if (image) {
      const targetRepresent: GalleryImage = image.group ? image.group.images.find(groupImage => groupImage.passesFilter) : image;
      const brickElement: HTMLImageElement = this.bricks[targetRepresent?.id];
      if (brickElement && !ScreenUtils.isElementVisible(brickElement)) {
        const containerElement: HTMLElement = document.getElementsByClassName('masonry-scroll-container')[0] as HTMLElement;
        const position: number = targetRepresent.top - (containerElement.clientHeight - brickElement.height) / 2;
        // scrollIntoView is bugged on Chrome when scrolling multiple elements at once (masonry+sidebar)
        containerElement.scrollTo({ top: position, behavior: 'smooth' });
      }
    }
  }

  private updateMasonryTargetReference(): void {
    const target: GalleryImage = this.stateService.target();
    if (target && this.stateService.masonryImages) {
      if (this.stateService.masonryImages.includes(target)) {
        this.stateService.masonryTargetReference = target;
      } else if (target.group && target.group.images.some(groupImage => this.stateService.masonryImages.includes(groupImage))) {
        this.stateService.masonryTargetReference = ArrayUtils.findClosest(target.group.images, target, groupImage => this.stateService.masonryImages.includes(groupImage));
      }
    }
  }

  private getShortestColumnIndex(columns: number[]): number {
    return columns.indexOf(Math.min(...columns));
  }

  protected onImageClick(image: GalleryImage): void {
    if (this.galleryService.editingGroupImages) {
      if (image.group && this.galleryService.editingGroup != image.group) {
        return;
      }

      ArrayUtils.toggle(this.galleryService.editingGroupImages, image);
      return;
    }

    this.stateService.target.set(image);
    this.stateService.fullscreenVisible.set(true);
  }

  protected onGroupToggleClick(event: MouseEvent, image: GalleryImage): void {
    if (ScreenUtils.isLargeScreen()) {
      event.stopPropagation();
      if (image.group) {
        image.group.open = !image.group.open;
        this.stateService.refreshFilter();
      }
    }
  }

  protected onBrickCreate(elementRef: ElementRef, image: GalleryImage): void {
    this.bricks[image.id] = elementRef.nativeElement;
  }

  protected onMasonryContainerCreate(elementRef: ElementRef): void {
    this.masonryContainer = elementRef.nativeElement;
    this.updateLayout();
  }

  // TODO show tippy: Other images in group are filtered out
  protected shouldDisableGroupToggleButton(image: GalleryImage): boolean {
    return image.group && image.group.images.filter(groupImage => groupImage.passesFilter).length < 2;
  }

  @HostListener('window:resize')
  protected onResize() {
    this.updateLayout();
  }

  protected areBrickButtonsVisible(): boolean {
    return ScreenUtils.isLargeScreen() && !this.galleryService.editingGroup;
  }

}
