import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ImageComponent } from './image.component';

describe('ImageComponent load failures', () => {
  const imageUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>';

  it('clears a stale same-size image and still accepts a late preview', fakeAsync(() => {
    let failOriginal: () => void;
    let finishPreview: () => void;
    spyOn(HTMLImageElement.prototype, 'decode').and.returnValues(
      Promise.resolve(), new Promise<void>((_, reject) => failOriginal = reject),
      new Promise<void>(resolve => finishPreview = resolve)
    );
    const fixture = TestBed.createComponent(ImageComponent);
    const visible = () => fixture.nativeElement.querySelector('img.visible')?.getAttribute('src');
    fixture.componentRef.setInput('sourceWidth', 8);
    fixture.componentRef.setInput('sourceHeight', 8);
    fixture.componentRef.setInput('src', imageUrl);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(visible()).toBe(imageUrl);

    fixture.componentRef.setInput('src', imageUrl + '#next');
    fixture.componentRef.setInput('placeholderSrc', imageUrl + '#preview');
    fixture.detectChanges();
    failOriginal();
    flushMicrotasks();
    fixture.detectChanges();
    expect(visible()).toBeUndefined();
    finishPreview();
    tick();
    fixture.detectChanges();
    expect(visible()).toBe(imageUrl + '#preview');
  }));

  it('keeps the current preview when either an obsolete or its own original fails', fakeAsync(() => {
    let failOld: () => void;
    let failCurrent: () => void;
    spyOn(HTMLImageElement.prototype, 'decode').and.returnValues(
      new Promise<void>((_, reject) => failOld = reject),
      new Promise<void>((_, reject) => failCurrent = reject), Promise.resolve()
    );
    const fixture = TestBed.createComponent(ImageComponent);
    fixture.componentRef.setInput('src', imageUrl);
    fixture.detectChanges();
    fixture.componentRef.setInput('src', imageUrl + '#next');
    fixture.componentRef.setInput('placeholderSrc', imageUrl + '#preview');
    fixture.detectChanges();
    tick();
    failOld();
    failCurrent();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img.visible')?.getAttribute('src')).toBe(imageUrl + '#preview');
  }));
});
