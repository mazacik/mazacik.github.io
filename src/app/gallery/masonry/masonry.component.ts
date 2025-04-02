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

  private bricks: { [key: string]: HTMLImageElement } = {};
  private masonryContainer: HTMLElement;

  protected masonryImages: GalleryImage[];

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    protected googleService: GalleryGoogleDriveService,
    protected galleryService: GalleryService
  ) {
    effect(() => this.updateLayout());
    effect(() => this.scrollTo(this.stateService.target()));
  }

  private updateLayout(): void {
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
        if (image.width != columnWidth) {
          image.width = columnWidth;
          image.height = columnWidth / image.aspectRatio;
        }

        const shortestColumnIndex: number = this.getShortestColumnIndex(columnsTop);
        image.top = columnsTop[shortestColumnIndex];
        image.left = columnsLeft[shortestColumnIndex];
        columnsTop[shortestColumnIndex] = columnsTop[shortestColumnIndex] + image.height + masonryGap;
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

  private getShortestColumnIndex(columns: number[]): number {
    return columns.indexOf(Math.min(...columns));
  }

  protected onImageClick(image: GalleryImage): void {
    const groupEditorGroup: GalleryGroup = this.stateService.groupEditorGroup;
    if (groupEditorGroup) {
      if (image.group && groupEditorGroup != image.group) {
        return;
      }

      ArrayUtils.toggle(groupEditorGroup.images, image);
      return;
    }

    this.stateService.target.set(image);
  }

  protected onBrickCreate(elementRef: ElementRef, image: GalleryImage): void {
    this.bricks[image.id] = elementRef.nativeElement;
  }

  protected onMasonryContainerCreate(elementRef: ElementRef): void {
    this.masonryContainer = elementRef.nativeElement;
    this.updateLayout();
  }

  @HostListener('window:resize')
  protected onResize() {
    this.updateLayout();
  }

  protected areBrickButtonsVisible(): boolean {
    return ScreenUtils.isLargeScreen() && !this.stateService.groupEditorGroup;
  }

}
