import { CommonModule } from '@angular/common';
import { Component, effect, input, InputSignal } from '@angular/core';

@Component({
  selector: 'app-image',
  imports: [CommonModule],
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.scss']
})
export class ImageComponent {

  public src: InputSignal<string> = input.required<string>();
  public placeholderSrc: InputSignal<string> = input<string>();

  private trackBy = 0;
  protected images: { trackBy: number; src: string; }[] = [];

  constructor() {
    effect(() => this.next(this.src(), this.placeholderSrc()));
  }

  private next(src: string, placeholderSrc: string): void {
    if (!src) return;

    const trackBy = ++this.trackBy;
    let srcLoaded = false;

    const srcDecoder = new Image();
    srcDecoder.src = src;

    if (srcDecoder.complete) {
      this.images = [{ trackBy: trackBy, src: src }];
      return;
    }

    srcDecoder.decode().finally(() => {
      if (trackBy == this.trackBy) {
        srcLoaded = true;
        this.images = [{ trackBy: trackBy, src: src }];
      }
    });

    if (placeholderSrc) {
      const placeholderDecoder = new Image();
      placeholderDecoder.src = placeholderSrc;

      if (placeholderDecoder.complete) {
        this.images = [{ trackBy: trackBy, src: placeholderSrc }];
        return;
      }

      placeholderDecoder.decode().finally(() => {
        if (trackBy == this.trackBy && !srcLoaded) {
          this.images = [{ trackBy: trackBy, src: placeholderSrc }];
        }
      });
    }

    this.images = [];
  }

}
