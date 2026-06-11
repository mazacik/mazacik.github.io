import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, ElementRef, input, InputSignal, output, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-image',
  imports: [CommonModule],
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.scss']
})
export class ImageComponent {

  public src: InputSignal<string> = input.required<string>();
  public placeholderSrc: InputSignal<string> = input<string>();
  public sourceWidth: InputSignal<number> = input<number>();
  public sourceHeight: InputSignal<number> = input<number>();
  public imageDisplayed: OutputEmitterRef<string> = output<string>();

  private requestTrackBy = 0;
  private displayTrackBy = 0;
  private transitionTrackBy = 0;
  private fadeOutTrackBy = 0;
  private activeTrackBy?: number;
  private readonly animationFrames = new Set<number>();
  private readonly fallbackTimeouts = new Set<number>();
  protected images: DisplayImage[] = [];

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {
    this.destroyRef.onDestroy(() => this.clearScheduledCallbacks());
    effect(() => this.next(this.src(), this.placeholderSrc(), this.sourceWidth(), this.sourceHeight()));
  }

  private next(src: string, placeholderSrc: string, sourceWidth?: number, sourceHeight?: number): void {
    if (!src) {
      return;
    }

    const requestTrackBy = ++this.requestTrackBy;
    let srcLoaded = false;
    this.schedulePendingRequestFadeOut(src, sourceWidth, sourceHeight);

    const srcDecoder = new Image();
    srcDecoder.src = src;

    if (srcDecoder.complete) {
      this.showDecodedImage(requestTrackBy, src, srcDecoder.naturalWidth, srcDecoder.naturalHeight, sourceWidth, sourceHeight);
      return;
    }

    srcDecoder.decode().then(() => {
      if (requestTrackBy === this.requestTrackBy) {
        srcLoaded = true;
        this.showDecodedImage(requestTrackBy, src, srcDecoder.naturalWidth, srcDecoder.naturalHeight, sourceWidth, sourceHeight);
      }
    }).catch(() => {
      if (requestTrackBy === this.requestTrackBy && !placeholderSrc) {
        srcLoaded = true;
        this.showDecodedImage(requestTrackBy, src, srcDecoder.naturalWidth, srcDecoder.naturalHeight, sourceWidth, sourceHeight);
      }
    });

    if (placeholderSrc) {
      const placeholderDecoder = new Image();
      placeholderDecoder.src = placeholderSrc;

      if (placeholderDecoder.complete) {
        this.showPlaceholderImage(requestTrackBy, placeholderSrc, placeholderDecoder.naturalWidth, placeholderDecoder.naturalHeight, sourceWidth, sourceHeight);
        return;
      }

      placeholderDecoder.decode().then(() => {
        if (requestTrackBy === this.requestTrackBy && !srcLoaded) {
          this.showPlaceholderImage(requestTrackBy, placeholderSrc, placeholderDecoder.naturalWidth, placeholderDecoder.naturalHeight, sourceWidth, sourceHeight);
        }
      }).catch(() => undefined);
    }
  }

  private showDecodedImage(requestTrackBy: number, src: string, naturalWidth: number, naturalHeight: number, sourceWidth?: number, sourceHeight?: number): void {
    const nextImage = this.createDisplayImage(requestTrackBy, src, naturalWidth, naturalHeight, sourceWidth, sourceHeight);
    this.showImage(nextImage);
  }

  private showPlaceholderImage(requestTrackBy: number, src: string, naturalWidth: number, naturalHeight: number, sourceWidth?: number, sourceHeight?: number): void {
    const placeholderImage = this.createDisplayImage(requestTrackBy, src, naturalWidth, naturalHeight, sourceWidth, sourceHeight);
    this.showImage(placeholderImage);
  }

  private createDisplayImage(requestTrackBy: number, src: string, naturalWidth: number, naturalHeight: number, sourceWidth?: number, sourceHeight?: number): DisplayImage {
    return {
      trackBy: ++this.displayTrackBy,
      requestTrackBy,
      src,
      naturalWidth,
      naturalHeight,
      sourceWidth: sourceWidth ?? naturalWidth,
      sourceHeight: sourceHeight ?? naturalHeight
    };
  }

  private showImage(nextImage: DisplayImage): void {
    const activeImage = this.getActiveImage();
    if (activeImage?.src === nextImage.src) {
      return;
    }

    this.clearScheduledCallbacks();

    if (activeImage) {
      this.transitionToNewImage(nextImage, !this.shouldPreserveActiveUntilNextVisible(activeImage, nextImage));
      return;
    }

    this.showOnly(nextImage);
  }

  private transitionToNewImage(nextImage: DisplayImage, fadeOutInactiveImmediately: boolean): void {
    const transitionTrackBy = ++this.transitionTrackBy;
    const inactiveImages = this.getTransitionSupportImages(nextImage).map((image, index) => ({
      ...image,
      visible: image.visible ?? true,
      fadingOut: false,
      fadeOutTrackBy: undefined,
      zIndex: index + 1
    }));
    const activeImage: DisplayImage = {
      ...nextImage,
      visible: false,
      fadingOut: false,
      fadeOutTrackBy: undefined,
      zIndex: inactiveImages.length + 1
    };

    this.images = [...inactiveImages, activeImage];
    this.activeTrackBy = nextImage.trackBy;
    this.setVisibleOnNextFrame(transitionTrackBy, nextImage.trackBy, true);
    if (fadeOutInactiveImmediately) {
      this.fadeOutInactiveImagesOnNextFrame(transitionTrackBy);
    }
  }

  private showOnly(image: DisplayImage): void {
    this.clearScheduledCallbacks();
    ++this.transitionTrackBy;
    this.images = [{ ...image, visible: true, fadingOut: false, fadeOutTrackBy: undefined, zIndex: 1 }];
    this.activeTrackBy = image.trackBy;
    this.emitImageDisplayed(image.trackBy);
  }

  private fadeOutCurrentImageForPendingRequest(nextSrc: string, sourceWidth?: number, sourceHeight?: number): void {
    const activeImage = this.getActiveImage();
    if (
      !activeImage
      || activeImage.src === nextSrc
      || this.hasSameSourceSize(activeImage, sourceWidth, sourceHeight)
    ) {
      return;
    }

    this.clearScheduledCallbacks();
    ++this.transitionTrackBy;
    this.images = this.images.map(image => ({
      ...image,
      visible: false,
      fadingOut: false,
      fadeOutTrackBy: undefined
    }));
  }

  private schedulePendingRequestFadeOut(nextSrc: string, sourceWidth?: number, sourceHeight?: number): void {
    this.clearScheduledCallbacks();
    this.scheduleAnimationFrame(() => this.fadeOutCurrentImageForPendingRequest(nextSrc, sourceWidth, sourceHeight));
  }

  private shouldPreserveActiveUntilNextVisible(activeImage: DisplayImage, nextImage: DisplayImage): boolean {
    return activeImage.requestTrackBy === nextImage.requestTrackBy
      || this.hasSameSourceSize(activeImage, nextImage.sourceWidth, nextImage.sourceHeight);
  }

  private hasSameSourceSize(image: DisplayImage, sourceWidth?: number, sourceHeight?: number): boolean {
    return !!sourceWidth
      && !!sourceHeight
      && image.sourceWidth === sourceWidth
      && image.sourceHeight === sourceHeight;
  }

  private getTransitionSupportImages(nextImage: DisplayImage): DisplayImage[] {
    const activeImage = this.getActiveImage();
    const existingTargetImage = this.images.find(image => image.src === nextImage.src);
    const supportImages: DisplayImage[] = [];

    if (existingTargetImage && existingTargetImage.trackBy !== activeImage?.trackBy) {
      supportImages.push(existingTargetImage);
    }

    if (activeImage && activeImage.trackBy !== existingTargetImage?.trackBy) {
      supportImages.push(activeImage);
    }

    if (!supportImages.length) {
      const fallbackImage = this.images.find(image => image.visible) ?? this.images[0];
      if (fallbackImage) {
        supportImages.push(fallbackImage);
      }
    }

    return supportImages.slice(-2);
  }

  private setVisibleOnNextFrame(transitionTrackBy: number, trackBy: number, visible: boolean): void {
    this.scheduleAnimationFrame(() => {
      this.scheduleAnimationFrame(() => {
        if (transitionTrackBy !== this.transitionTrackBy) {
          return;
        }

        this.images = this.images.map(image => image.trackBy === trackBy
          ? {
            ...image,
            visible,
            fadingOut: visible ? false : image.fadingOut,
            fadeOutTrackBy: visible ? undefined : image.fadeOutTrackBy
          }
          : image);
        if (visible) {
          this.emitImageDisplayed(trackBy);
        }
      });
    });
  }

  private emitImageDisplayed(trackBy: number): void {
    window.setTimeout(() => {
      const image = this.images.find(current => current.trackBy === trackBy);
      if (image && image.trackBy === this.activeTrackBy && image.visible) {
        this.imageDisplayed.emit(image.src);
      }
    });
  }

  private fadeOutInactiveImagesOnNextFrame(transitionTrackBy: number): void {
    this.scheduleAnimationFrame(() => {
      this.scheduleAnimationFrame(() => {
        if (transitionTrackBy !== this.transitionTrackBy) {
          return;
        }

        this.fadeOutInactiveImages();
      });
    });
  }

  protected onImageTransitionEnd(image: DisplayImage, event: TransitionEvent): void {
    if (event.propertyName !== 'opacity') {
      return;
    }

    const currentImage = this.images.find(current => current.trackBy === image.trackBy);
    if (!currentImage) {
      return;
    }

    if (currentImage.trackBy === this.activeTrackBy && currentImage.visible) {
      this.fadeOutInactiveImages();
      return;
    }

    this.completeInactiveImageFade(currentImage);
  }

  protected onImageTransitionCancel(image: DisplayImage, event: TransitionEvent): void {
    if (event.propertyName !== 'opacity') {
      return;
    }

    const currentImage = this.images.find(current => current.trackBy === image.trackBy);
    if (!currentImage) {
      return;
    }

    this.completeInactiveImageFade(currentImage);
  }

  private fadeOutInactiveImages(): void {
    this.images = this.images.map(image => image.trackBy === this.activeTrackBy
      ? { ...image, fadingOut: false, fadeOutTrackBy: undefined }
      : this.markInactiveImageForFadeOut(image));
    this.removeStaleInactiveImages();
  }

  private markInactiveImageForFadeOut(image: DisplayImage): DisplayImage {
    if (image.visible) {
      const fadeOutTrackBy = ++this.fadeOutTrackBy;
      this.scheduleInactiveFadeOutFallback(image.trackBy, fadeOutTrackBy);
      return { ...image, visible: false, fadingOut: true, fadeOutTrackBy };
    }

    return image;
  }

  private completeInactiveImageFade(image: DisplayImage): void {
    if (image.trackBy !== this.activeTrackBy && !image.visible && image.fadingOut) {
      this.removeInactiveImage(image.trackBy);
    }
  }

  private scheduleInactiveFadeOutFallback(trackBy: number, fadeOutTrackBy: number): void {
    this.scheduleAnimationFrame(() => {
      this.scheduleAnimationFrame(() => {
        const element = this.elementRef.nativeElement.querySelector(`[data-image-track-by="${trackBy}"]`);
        const cleanupDelayMs = element instanceof HTMLElement
          ? this.getOpacityTransitionMs(element) + 100
          : 100;

        this.scheduleTimeout(() => {
          const image = this.images.find(current => current.trackBy === trackBy);
          if (
            image
            && image.trackBy !== this.activeTrackBy
            && !image.visible
            && image.fadingOut
            && image.fadeOutTrackBy === fadeOutTrackBy
          ) {
            this.removeInactiveImage(trackBy);
          }
        }, cleanupDelayMs);
      });
    });
  }

  private scheduleAnimationFrame(callback: FrameRequestCallback): void {
    const animationFrameId = window.requestAnimationFrame(time => {
      this.animationFrames.delete(animationFrameId);
      callback(time);
    });
    this.animationFrames.add(animationFrameId);
  }

  private scheduleTimeout(callback: () => void, delayMs: number): void {
    const timeoutId = window.setTimeout(() => {
      this.fallbackTimeouts.delete(timeoutId);
      callback();
    }, delayMs);
    this.fallbackTimeouts.add(timeoutId);
  }

  private clearScheduledCallbacks(): void {
    this.animationFrames.forEach(animationFrameId => window.cancelAnimationFrame(animationFrameId));
    this.fallbackTimeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
    this.animationFrames.clear();
    this.fallbackTimeouts.clear();
  }

  private getOpacityTransitionMs(element: HTMLElement): number {
    const styles = window.getComputedStyle(element);
    const properties = this.splitTransitionValues(styles.transitionProperty);
    const durations = this.splitTransitionValues(styles.transitionDuration).map(value => this.parseCssTimeMs(value));
    const delays = this.splitTransitionValues(styles.transitionDelay).map(value => this.parseCssTimeMs(value));
    const opacityIndex = properties.findIndex(property => property === 'opacity' || property === 'all');
    const index = opacityIndex >= 0 ? opacityIndex : 0;

    return this.getTransitionValue(durations, index) + this.getTransitionValue(delays, index);
  }

  private splitTransitionValues(value: string): string[] {
    return value.split(',').map(part => part.trim());
  }

  private getTransitionValue(values: number[], index: number): number {
    return values[index] ?? values[values.length - 1] ?? 0;
  }

  private parseCssTimeMs(value: string): number {
    const numericValue = parseFloat(value);
    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    return value.endsWith('ms') ? numericValue : numericValue * 1000;
  }

  private removeInactiveImage(trackBy: number): void {
    this.images = this.images.filter(image => image.trackBy === this.activeTrackBy || image.trackBy !== trackBy);
    this.removeStaleInactiveImages();
  }

  private removeStaleInactiveImages(): void {
    const images = this.images.filter(image => image.trackBy === this.activeTrackBy || image.visible || image.fadingOut);
    const hasInactiveImages = images.some(image => image.trackBy !== this.activeTrackBy);

    this.images = images.map(image => {
      if (image.trackBy !== this.activeTrackBy) {
        return image;
      }

      return hasInactiveImages
        ? { ...image, fadingOut: false, fadeOutTrackBy: undefined }
        : { ...image, visible: true, fadingOut: false, fadeOutTrackBy: undefined, zIndex: 1 };
    });
  }

  private getActiveImage(): DisplayImage | undefined {
    return this.images.find(image => image.trackBy === this.activeTrackBy);
  }

}

interface DisplayImage {
  trackBy: number;
  requestTrackBy: number;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  visible?: boolean;
  fadingOut?: boolean;
  fadeOutTrackBy?: number;
  zIndex?: number;
}
