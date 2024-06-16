import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, effect } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { GalleryImage } from 'src/app/gallery/model/gallery-image.class';
import { leave } from 'src/app/shared/constants/animations.constants';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ScreenUtils } from '../../shared/utils/screen.utils';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-masonry',
  standalone: true,
  imports: [
    CommonModule,
    CreateDirective,
    TippyDirective
  ],
  templateUrl: './masonry.component.html',
  styleUrls: ['./masonry.component.scss'],
  animations: [leave]
})
export class MasonryComponent {

  private bricks: { [key: string]: HTMLImageElement } = {};
  private masonryContainer: HTMLElement;

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService
  ) {
    effect(() => this.updateLayout());
    effect(() => this.scrollToTarget());
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

  private scrollToTarget(): void {
    const target: GalleryImage = this.stateService.target();
    if (target) {
      const targetRepresent: GalleryImage = target.group ? target.group.images.find(groupImage => groupImage.passesFilter) : target;
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
    if (this.stateService.modifyingGroup) {
      const target: GalleryImage = this.stateService.target();
      if (image.group && target.group && !target.group.images.includes(image)) {
        return;
      }

      ArrayUtils.toggle(this.stateService.modifyingGroup, image);
      return;
    }

    if (ScreenUtils.isLargeScreen() && image == this.stateService.target()) {
      this.stateService.fullscreenVisible.set(true);
    }

    this.stateService.target.set(image);
    this.stateService.sidebarVisible = true;
  }

  protected onHeartClick(event: MouseEvent, image: GalleryImage): void {
    if (ScreenUtils.isLargeScreen()) {
      event.stopPropagation();
      this.stateService.toggleHeart(image);
    }
  }

  protected onBookmarkClick(event: MouseEvent, image: GalleryImage): void {
    if (ScreenUtils.isLargeScreen()) {
      event.stopPropagation();
      this.stateService.toggleBookmark(image);
    }
  }

  protected onLikeClick(event: MouseEvent, image: GalleryImage): void {
    if (ScreenUtils.isLargeScreen()) {
      event.stopPropagation();
      this.stateService.like(image);
    }
  }

  protected onDislikeClick(event: MouseEvent, image: GalleryImage): void {
    if (ScreenUtils.isLargeScreen()) {
      event.preventDefault();
      this.stateService.dislike(image);
    }
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

  protected shouldDisableGroupToggleButton(image: GalleryImage): boolean {
    return image.group && image.group.images.filter(groupImage => groupImage.passesFilter).length < 2;
  }

  @HostListener('window:resize')
  protected onResize() {
    this.updateLayout();
  }

}
