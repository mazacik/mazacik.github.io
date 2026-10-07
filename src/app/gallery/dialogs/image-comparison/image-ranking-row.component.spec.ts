import { Component, EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageComponent } from '../../../shared/components/image/image.component';
import { GalleryImage } from '../../models/gallery-image.class';
import { ImageRankingRowComponent } from './image-ranking-row.component';

@Component({
  selector: 'app-image',
  template: '',
  inputs: ['src', 'placeholderSrc', 'sourceWidth', 'sourceHeight'],
  outputs: ['imageDisplayed']
})
class TestImageComponent {
  public readonly imageDisplayed = new EventEmitter<string>();
}

const thumbnail = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="gray"/></svg>';

function image(id: string): GalleryImage {
  return Object.assign(new GalleryImage(), { id, name: `${id}.jpg`, contentLink: thumbnail, thumbnailLink: thumbnail, mimeType: 'image/jpeg', aspectRatio: 4 / 3 });
}

describe('ImageRankingRowComponent', () => {
  let fixture: ComponentFixture<ImageRankingRowComponent>;
  let component: ImageRankingRowComponent;
  let active: GalleryImage;
  let scroller: HTMLElement;

  async function settle(): Promise<void> {
    await new Promise(resolve => window.setTimeout(resolve, 250));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ImageRankingRowComponent] }).overrideComponent(ImageRankingRowComponent, {
      remove: { imports: [ImageComponent] }, add: { imports: [TestImageComponent] }
    }).compileComponents();
    fixture = TestBed.createComponent(ImageRankingRowComponent);
    component = fixture.componentInstance;
    active = image('active');
    fixture.componentRef.setInput('activeImage', active);
    fixture.componentRef.setInput('rankedSubjects', ['a', 'b', 'c', 'd'].map(id => ({ id: `image:${id}`, image: image(id) })));
    Object.assign(fixture.nativeElement.style, { width: '1280px', height: '720px' });
    fixture.nativeElement.style.setProperty('--color-highlight', 'deepskyblue');
    fixture.nativeElement.style.setProperty('--color-border', '#3f3f46');
    fixture.detectChanges();
    scroller = fixture.nativeElement.querySelector('.ranked-scroller');
    await settle();
  });

  afterEach(() => fixture.destroy());

  function expectGapAtCenter(index: number): void {
    const gap = scroller.querySelectorAll<HTMLElement>('.insertion-gap')[index];
    const gapRect = gap.getBoundingClientRect();
    const scrollRect = scroller.getBoundingClientRect();
    expect(Math.abs(gapRect.top + gapRect.height / 2 - (scrollRect.top + scroller.clientHeight / 2))).toBeLessThanOrEqual(1);
    const indicator = fixture.nativeElement.querySelector('.insertion-indicator').getBoundingClientRect();
    expect(Math.abs(gapRect.top + gapRect.height / 2 - (indicator.top + indicator.height / 2))).toBeLessThanOrEqual(1);
  }

  it('starts at the middle gap, with all ranked images and both endpoint gaps', () => {
    expect(scroller.querySelectorAll('.ranked-card').length).toBe(4);
    expect(scroller.querySelectorAll('.insertion-gap').length).toBe(5);
    const gap = scroller.querySelector('.insertion-gap').getBoundingClientRect();
    const sharedGap = parseFloat(getComputedStyle(scroller).paddingLeft);
    expect(Math.abs(gap.height - sharedGap)).toBeLessThan(0.1);
    const cardRect = scroller.querySelector('.ranked-card').getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    expect(Math.abs(cardRect.left - scrollerRect.left - sharedGap)).toBeLessThan(1);
    expect(Math.abs(scrollerRect.left + scroller.clientWidth - cardRect.right - sharedGap)).toBeLessThan(1);
    expectGapAtCenter(2);
    const activeRect = fixture.nativeElement.querySelector('.active-image').getBoundingClientRect();
    const columnRect = fixture.nativeElement.querySelector('.ranked-column').getBoundingClientRect();
    expect(columnRect.left).toBeGreaterThanOrEqual(activeRect.right);
    expect(columnRect.top).toBe(activeRect.top);
    expect(columnRect.height).toBe(activeRect.height);
    expect(Array.from(scroller.querySelectorAll('.ranked-card')).map(card => card.getAttribute('aria-label'))).toEqual(['a', 'b', 'c', 'd'].map(id => `Open ${id}.jpg fullscreen`));
    const indicator = fixture.nativeElement.querySelector('.insertion-indicator').getBoundingClientRect();
    expect(indicator.height).toBe(8);
    expect(indicator.width).toBe(6);
    expect(indicator.left).toBe(fixture.nativeElement.querySelector('.column-viewport').getBoundingClientRect().left);
    expect(fixture.nativeElement.querySelector('.rank-number')).toBeNull();
    expect(fixture.nativeElement.querySelector('.placement-actions')).toBeNull();
    const placementButton = fixture.nativeElement.querySelector('.placement-button');
    expect(placementButton.parentElement.classList.contains('active-image')).toBeTrue();
    expect(getComputedStyle(placementButton).position).toBe('absolute');
    expect(Math.abs(columnRect.left - placementButton.getBoundingClientRect().right - sharedGap)).toBeLessThan(0.1);
  });

  it('centers the first and last gaps and only previews while scrolling', async () => {
    const place = spyOn(component.place, 'emit');
    scroller.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
    expectGapAtCenter(0);
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'instant' });
    await settle();
    expectGapAtCenter(4);
    expect(place).not.toHaveBeenCalled();
  });

  it('allows placement before image display and emits only once per active subject', () => {
    const place = spyOn(component.place, 'emit');
    const button = fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement;
    expect(button.disabled).toBeFalse();
    expect(button.classList.contains('disabled')).toBeFalse();
    button.click();
    button.click();
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 2 });
    expect(button.disabled).toBeFalse();
  });

  it('confirms the wheel destination immediately and cancels its animation', async () => {
    const place = spyOn(component.place, 'emit');
    const before = scroller.scrollTop;
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 180, bubbles: true, cancelable: true }));
    const button = fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement;
    expect(button.disabled).toBeFalse();
    expect(scroller.scrollTop).toBe(before);
    button.click();
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 3 });
    expectGapAtCenter(3);
    await new Promise(resolve => window.setTimeout(resolve, 600));
    expectGapAtCenter(3);
    expect(place).toHaveBeenCalledTimes(1);
  });

  for (const { steps, index } of [
    { steps: [1, 1, -1], index: 3 },
    { steps: [1, 1, 1, 1], index: 4 },
    { steps: [-1, -1, -1, -1], index: 0 }
  ]) {
    it(`confirms the queued destination ${index} after rapid wheel steps ${steps.join(', ')}`, () => {
      const place = spyOn(component.place, 'emit');
      for (const deltaY of steps) scroller.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
      (fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).click();
      expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index });
      expectGapAtCenter(index);
    });
  }

  it('confirms an arrow-key destination with keyboard button activation', () => {
    const place = spyOn(component.place, 'emit');
    scroller.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.nativeElement.querySelector('.placement-button').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 3 });
    expectGapAtCenter(3);
  });

  it('reads the nearest native scroll position even before its scroll event fires', async () => {
    const place = spyOn(component.place, 'emit');
    scroller.scrollTo({ top: scroller.scrollTop + 160, behavior: 'instant' });
    (fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).click();
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 3 });
    expectGapAtCenter(3);
    await settle();
    expectGapAtCenter(3);
  });

  it('confirms and cancels the pending native snap and settle timer', async () => {
    const place = spyOn(component.place, 'emit');
    scroller.scrollTo({ top: scroller.scrollTop + 160, behavior: 'instant' });
    scroller.dispatchEvent(new Event('scroll'));
    scroller.dispatchEvent(new Event('scrollend'));
    (fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).click();
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 3 });
    expectGapAtCenter(3);
    await new Promise(resolve => window.setTimeout(resolve, 600));
    expectGapAtCenter(3);
    expect(place).toHaveBeenCalledTimes(1);
  });

  it('confirms the intended middle gap before a new subject is initially aligned', async () => {
    const place = spyOn(component.place, 'emit');
    scroller.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
    fixture.componentRef.setInput('activeImage', Object.assign(image('next'), { contentLink: 'next.jpg', thumbnailLink: 'next-thumbnail.jpg' }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).click();
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:next', index: 2 });
    expectGapAtCenter(2);
    await settle();
    expectGapAtCenter(2);
  });

  it('confirms restart alignment before its frame runs', async () => {
    const place = spyOn(component.place, 'emit');
    scroller.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
    component.resetPosition();
    (fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).click();
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 2 });
    expectGapAtCenter(2);
  });

  it('advances wheel input from the intended gap when initial alignment is pending', async () => {
    const place = spyOn(component.place, 'emit');
    scroller.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
    component.resetPosition();
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true }));
    (fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).click();
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 3 });
    expectGapAtCenter(3);
  });

  it('retains the logical destination through resize alignment', async () => {
    const place = spyOn(component.place, 'emit');
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'instant' });
    await settle();
    const resized = new Promise<void>(resolve => {
      const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); });
      observer.observe(scroller);
    });
    fixture.nativeElement.style.height = '620px';
    await resized;
    (fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).click();
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 4 });
    expectGapAtCenter(4);
  });

  it('does not place the next subject on the second click of a double-click', () => {
    const place = spyOn(component.place, 'emit');
    const button = fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement;
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    fixture.componentRef.setInput('activeImage', image('next'));
    fixture.detectChanges();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
    expect(place).toHaveBeenCalledOnceWith({ subjectId: 'image:active', index: 2 });
    expect(button.disabled).toBeFalse();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(place.calls.allArgs()).toEqual([
      [{ subjectId: 'image:active', index: 2 }], [{ subjectId: 'image:next', index: 2 }]
    ]);
  });

  it('does not reset the submission guard when the same subject changes its source', () => {
    const place = spyOn(component.place, 'emit');
    const button = fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement;
    button.click();
    fixture.componentRef.setInput('activeImage', Object.assign(image('active'), { contentLink: 'another-source.jpg' }));
    fixture.detectChanges();
    button.click();
    expect(place).toHaveBeenCalledTimes(1);
  });

  it('recenters for a new subject and for restart', async () => {
    scroller.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
    fixture.componentRef.setInput('activeImage', image('next'));
    fixture.detectChanges();
    await settle();
    expectGapAtCenter(2);
    scroller.scrollTo({ top: 0, behavior: 'instant' });
    await settle();
    component.resetPosition();
    await settle();
    expectGapAtCenter(2);
  });

  it('keeps the selected gap centered when the viewport resizes', async () => {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'instant' });
    await settle();
    fixture.nativeElement.style.height = '620px';
    await settle();
    expectGapAtCenter(4);
  });

  it('keeps every gap reachable in a long ranking', async () => {
    fixture.componentRef.setInput('rankedSubjects', Array.from({ length: 1000 }, (_, index) => ({ id: `image:${index}`, image: image(`${index}`) })));
    fixture.detectChanges();
    await settle();
    expect(scroller.querySelectorAll('.ranked-card').length).toBe(1000);
    expectGapAtCenter(500);
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'instant' });
    await settle();
    expectGapAtCenter(1000);
  });

  it('uses equal-width portrait and landscape rectangles with centered endpoint gaps', async () => {
    fixture.componentRef.setInput('rankedSubjects', [0.5, 2, 4 / 3].map((aspectRatio, index) => ({
      id: `image:${index}`, image: Object.assign(image(`${index}`), { aspectRatio })
    })));
    fixture.detectChanges();
    await settle();
    const cards = Array.from(scroller.querySelectorAll<HTMLElement>('.ranked-card'));
    expect(cards.map(card => Math.round(card.getBoundingClientRect().width))).toEqual([320, 320, 320]);
    expect(cards.map(card => Math.round(card.getBoundingClientRect().height))).toEqual([640, 160, 240]);
    expectGapAtCenter(1);
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'instant' });
    await settle();
    expectGapAtCenter(3);
  });

  it('uses the loaded thumbnail dimensions when image metadata is unavailable', async () => {
    const portrait = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="160"><rect width="80" height="160" fill="gray"/></svg>';
    fixture.componentRef.setInput('rankedSubjects', [{ id: 'image:portrait', image: Object.assign(image('portrait'), { aspectRatio: undefined, contentLink: portrait, thumbnailLink: portrait }) }]);
    fixture.detectChanges();
    await settle();
    const card = scroller.querySelector('.ranked-card').getBoundingClientRect();
    expect(Math.abs(card.width - card.height / 2)).toBeLessThanOrEqual(2);
    expectGapAtCenter(0);
  });

  it('maps vertical and horizontal mouse-wheel movement to placement without committing', async () => {
    const place = spyOn(component.place, 'emit');
    const wheel = new WheelEvent('wheel', { deltaY: 180, bubbles: true, cancelable: true });
    scroller.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBeTrue();
    expect((fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).disabled).toBeFalse();
    await new Promise(resolve => window.setTimeout(resolve, 600));
    fixture.detectChanges();
    expectGapAtCenter(3);
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaX: -180, bubbles: true, cancelable: true }));
    await new Promise(resolve => window.setTimeout(resolve, 600));
    fixture.detectChanges();
    expectGapAtCenter(2);
    expect(place).not.toHaveBeenCalled();
  });

  it('moves exactly one gap regardless of wheel magnitude, delta mode, or thumbnail height', async () => {
    fixture.componentRef.setInput('rankedSubjects', [0.5, 3, 0.75, 2].map((aspectRatio, index) => ({
      id: `image:${index}`, image: Object.assign(image(`${index}`), { aspectRatio })
    })));
    fixture.detectChanges();
    await settle();
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 10000, deltaMode: 2, bubbles: true, cancelable: true }));
    await new Promise(resolve => window.setTimeout(resolve, 600));
    expectGapAtCenter(3);
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: -0.25, bubbles: true, cancelable: true }));
    await new Promise(resolve => window.setTimeout(resolve, 600));
    expectGapAtCenter(2);
  });

  it('counts rapid wheel steps from the requested gap, supports reversal, and stops at both ends', async () => {
    const wheel = (deltaY: number) => scroller.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
    wheel(1);
    wheel(1);
    wheel(1);
    wheel(-1);
    await new Promise(resolve => window.setTimeout(resolve, 600));
    expectGapAtCenter(3);
    for (let index = 0; index < 10; index++) wheel(-1);
    await new Promise(resolve => window.setTimeout(resolve, 600));
    expectGapAtCenter(0);
    wheel(-1);
    expect((component as any).motionActive).toBeFalse();
    wheel(0);
    expectGapAtCenter(0);
  });

  it('animates a wheel notch across frames instead of jumping immediately', async () => {
    const before = scroller.scrollTop;
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 180, bubbles: true, cancelable: true }));
    expect(scroller.scrollTop).toBe(before);
    await new Promise(resolve => window.requestAnimationFrame(resolve));
    const firstFrame = scroller.scrollTop;
    expect(firstFrame).toBeGreaterThan(before);
    expect(firstFrame).toBeLessThan(before + 180);
    await new Promise(resolve => window.requestAnimationFrame(resolve));
    expect(scroller.scrollTop).toBeGreaterThan(firstFrame);
    await new Promise(resolve => window.setTimeout(resolve, 600));
    expectGapAtCenter(3);
  });

  it('snaps native scrolling without rescanning a long ranking', async () => {
    fixture.componentRef.setInput('rankedSubjects', Array.from({ length: 1000 }, (_, index) => ({ id: `image:${index}`, image: image(`${index}`) })));
    fixture.detectChanges();
    await settle();
    const queries = spyOn(scroller, 'querySelectorAll').and.callThrough();
    const before = scroller.scrollTop;
    scroller.scrollTo({ top: before + 200, behavior: 'instant' });
    await new Promise(resolve => window.requestAnimationFrame(resolve));
    expect(scroller.scrollTop).toBe(before + 200);
    expect(queries).not.toHaveBeenCalled();
    await new Promise(resolve => window.setTimeout(resolve, 600));
    expectGapAtCenter(501);
    expect((component as any).motionActive).toBeFalse();
  });

  it('supports line-mode wheel events and leaves control-wheel zoom available', async () => {
    const zoom = new WheelEvent('wheel', { deltaY: 180, ctrlKey: true, bubbles: true, cancelable: true });
    const before = scroller.scrollTop;
    scroller.dispatchEvent(zoom);
    expect(zoom.defaultPrevented).toBeFalse();
    expect(scroller.scrollTop).toBe(before);
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 12, deltaMode: 1, bubbles: true, cancelable: true }));
    await new Promise(resolve => window.setTimeout(resolve, 600));
    fixture.detectChanges();
    expectGapAtCenter(3);
  });

  it('does not recenter a moving wheel gesture when a thumbnail alignment is pending', async () => {
    (component as any).onThumbnailLoad();
    const before = scroller.scrollTop;
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true }));
    await new Promise(resolve => window.setTimeout(resolve, 50));
    expect(scroller.scrollTop).toBeGreaterThan(before);
    expect(scroller.scrollTop).toBeLessThan(before + 250);
  });

  it('allows wheel input during a mouse press without starting drag scrolling', async () => {
    const clientX = scroller.getBoundingClientRect().left + 20;
    scroller.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', pointerId: 3, button: 0, clientY: 600, clientX, bubbles: true }));
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 180, bubbles: true, cancelable: true }));
    await new Promise(resolve => window.setTimeout(resolve, 600));
    fixture.detectChanges();
    expectGapAtCenter(3);
  });

  it('does not scroll or capture mouse and pen drags and keeps thumbnail clicks available', async () => {
    const fullscreen = spyOn(component.fullscreen, 'emit');
    const capture = spyOn(scroller, 'setPointerCapture');
    const card = scroller.querySelector('.ranked-card') as HTMLButtonElement;
    const before = scroller.scrollTop;
    const clientX = scroller.getBoundingClientRect().left + 20;
    for (const pointerType of ['mouse', 'pen']) {
      for (const [type, clientY] of [['pointerdown', 600], ['pointermove', 360], ['pointerup', 360]] as const) {
        const event = new PointerEvent(type, { pointerType, pointerId: 1, button: 0, buttons: 1, clientY, clientX, bubbles: true, cancelable: true });
        card.dispatchEvent(event);
        expect(event.defaultPrevented).toBeFalse();
      }
    }
    await new Promise(resolve => window.requestAnimationFrame(resolve));
    expect(capture).not.toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(before);
    expectGapAtCenter(2);
    expect(getComputedStyle(scroller).cursor).not.toBe('grab');
    card.click();
    expect(fullscreen).toHaveBeenCalledOnceWith(component.rankedSubjects[0].image);
  });

  it('leaves touch gestures to the browser and snaps after native scrolling ends', async () => {
    const capture = spyOn(scroller, 'setPointerCapture');
    const clientX = scroller.getBoundingClientRect().left + 20;
    for (const type of ['pointerdown', 'pointermove', 'pointercancel']) {
      const event = new PointerEvent(type, { pointerType: 'touch', pointerId: 2, clientX, clientY: 360, bubbles: true, cancelable: true });
      scroller.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    }
    expect(capture).not.toHaveBeenCalled();
    scroller.scrollTo({ top: scroller.scrollTop + 200, behavior: 'instant' });
    scroller.dispatchEvent(new Event('scroll'));
    scroller.dispatchEvent(new Event('scrollend'));
    await new Promise(resolve => window.setTimeout(resolve, 600));
    fixture.detectChanges();
    expectGapAtCenter(3);
    expect((component as any).motionActive).toBeFalse();
  });

  it('snaps a partially scrolled position to the nearest insertion gap', async () => {
    scroller.scrollTo({ top: 60, behavior: 'instant' });
    await new Promise(resolve => window.setTimeout(resolve, 500));
    fixture.detectChanges();
    expectGapAtCenter(0);
    expect((fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('supports arrow keys and opens ranked images fullscreen without placement', async () => {
    const place = spyOn(component.place, 'emit');
    const fullscreen = spyOn(component.fullscreen, 'emit');
    scroller.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await new Promise(resolve => window.setTimeout(resolve, 500));
    fixture.detectChanges();
    expectGapAtCenter(3);
    (scroller.querySelector('.ranked-card') as HTMLButtonElement).click();
    expect(fullscreen).toHaveBeenCalledOnceWith(component.rankedSubjects[0].image);
    expect(place).not.toHaveBeenCalled();
  });

  it('retains grouped subjects as one ranked card and cycles the active group', () => {
    const sibling = image('sibling');
    const group = { id: 'group', images: [active, sibling] };
    active.group = group as any;
    sibling.group = group as any;
    fixture.componentRef.setInput('activeImage', active);
    fixture.componentRef.setInput('rankedSubjects', [{ id: 'group:other', image: image('representative') }]);
    fixture.detectChanges();
    expect(scroller.querySelectorAll('.ranked-card').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.group-navigation')).not.toBeNull();
    (component as any).showGroupImage(1);
    expect((component as any).displayedImage).toBe(sibling);
    expect((fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement).disabled).toBeFalse();
  });
});

describe('ImageRankingRowComponent image loading', () => {
  let fixture: ComponentFixture<ImageRankingRowComponent>;

  afterEach(() => fixture.destroy());

  it('renders every group arrow click without another interaction or a forced refresh', async () => {
    await TestBed.configureTestingModule({ imports: [ImageRankingRowComponent] }).compileComponents();
    fixture = TestBed.createComponent(ImageRankingRowComponent);
    const members = ['red', 'green', 'blue'].map(color => Object.assign(image(color), {
      contentLink: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="${color}"/></svg>`,
      thumbnailLink: undefined
    }));
    const group = { id: 'active-group', images: members };
    members.forEach(member => member.group = group as any);
    fixture.componentRef.setInput('activeImage', members[0]);
    fixture.componentRef.setInput('rankedSubjects', [{ id: 'image:a', image: image('a') }]);
    Object.assign(fixture.nativeElement.style, { width: '1280px', height: '720px' });
    fixture.autoDetectChanges();

    const expectVisible = async (member: GalleryImage): Promise<void> => {
      await new Promise(resolve => window.setTimeout(resolve, 250));
      // The previous layer stays visible underneath during the crossfade.
      const visible = Array.from(fixture.nativeElement.querySelectorAll('.active-image app-image img.visible')).pop() as HTMLImageElement;
      expect(visible?.getAttribute('src')).toBe(member.contentLink);
    };
    await expectVisible(members[0]);
    for (const [direction, index] of [['right', 1], ['right', 2], ['right', 0], ['left', 2], ['left', 1]] as const) {
      (fixture.nativeElement.querySelector(`.group-navigation .fa-chevron-${direction}`) as HTMLButtonElement).click();
      await expectVisible(members[index]);
    }
  });

  it('keeps placement available while real images load and subjects share their source', async () => {
    await TestBed.configureTestingModule({ imports: [ImageRankingRowComponent] }).compileComponents();
    fixture = TestBed.createComponent(ImageRankingRowComponent);
    fixture.componentRef.setInput('activeImage', image('first'));
    fixture.componentRef.setInput('rankedSubjects', [{ id: 'image:a', image: image('a') }]);
    Object.assign(fixture.nativeElement.style, { width: '1280px', height: '720px' });
    fixture.detectChanges();
    await new Promise(resolve => window.setTimeout(resolve, 400));
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement;
    expect(button.disabled).toBeFalse();
    button.click();
    fixture.componentRef.setInput('activeImage', image('second'));
    fixture.detectChanges();
    await new Promise(resolve => window.setTimeout(resolve, 250));
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('.active-image app-image img.visible')).not.toBeNull();
  });
});
