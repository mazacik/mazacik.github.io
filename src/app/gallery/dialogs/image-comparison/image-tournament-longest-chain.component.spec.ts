import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationService } from '../../../shared/services/application.service';
import { ScreenUtils } from '../../../shared/utils/screen.utils';
import { GalleryImage } from '../../models/gallery-image.class';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';
import { ImageTournamentLongestChainComponent } from './image-tournament-longest-chain.component';

describe('comparison results', () => {
  let fixture: ComponentFixture<ImageTournamentLongestChainComponent>;
  let state: GalleryStateService;
  let row: HTMLElement;
  let nav: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ImageTournamentLongestChainComponent],
      providers: [
        { provide: GallerySerializationService, useValue: { save: jasmine.createSpy() } },
        { provide: ApplicationService, useValue: { reduceDataUsage: false } }
      ]
    });
    state = TestBed.inject(GalleryStateService);
    for (let i = 0; i < 20; i++) {
      const width = i % 2 ? 80 : 160;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="100"><rect width="${width}" height="100" fill="red"/></svg>`;
      const src = 'data:image/svg+xml,' + encodeURIComponent(svg);
      state.images.push(Object.assign(new GalleryImage(), {
        id: String(i), name: `Image ${i}`, aspectRatio: width / 100, thumbnailLink: src, contentLink: src
      }));
    }
    const ids = state.images.map(image => GallerySortUtils.getSortSubjectId(image));
    state.imageSort.start(ids, { rankedImageIds: ids, pendingImageIds: [], activeInsertion: null });
    fixture = TestBed.createComponent(ImageTournamentLongestChainComponent);
    Object.assign(fixture.nativeElement.style, { width: 'min(900px, 100vw)', height: '500px' });
    fixture.detectChanges();
    row = fixture.nativeElement.querySelector('.longest-chain');
    nav = fixture.nativeElement.querySelector('.rank-navigator');
  });

  it('jumps straight to the chosen entry in the filtered ranking', () => {
    state.images.forEach((image, i) => image.passesComparisonFilter = i % 2 === 0);
    fixture.componentRef.setInput('showOnlyFilteredImages', true);
    fixture.detectChanges();
    fixture.componentInstance.scrollToSubject('image:10');
    fixture.detectChanges();
    const index = 5;
    expect(row.children[index].querySelector('[role="img"]').getAttribute('aria-label')).toBe('Image 10');
    if (nav) {
      for (const strip of [row, nav]) {
        const item = strip.children[index].getBoundingClientRect();
        const center = strip.getBoundingClientRect().left + strip.clientWidth / 2;
        expect(Math.abs(item.left + item.width / 2 - center)).toBeLessThan(1.5);
      }
    } else {
      const item = row.children[index].getBoundingClientRect();
      const wrapper = row.parentElement;
      const center = wrapper.getBoundingClientRect().top + wrapper.clientHeight / 2;
      expect(Math.abs(item.top + item.height / 2 - center)).toBeLessThan(1.5);
      expect(getComputedStyle(row.children[index].querySelector('.rank-again-button')).opacity).toBe('1');
    }
  });

  it('slides both cards from their previous positions without shifting the surrounding images', async () => {
    fixture.componentInstance.scrollToSubject('image:2');
    const strips = nav ? [row, nav] : [row];
    const surrounding = strips.map(strip => strip.children[1].getBoundingClientRect());
    const cards = strips.flatMap(strip => [strip.children[2], strip.children[3]].map(slot => {
      const card = slot.firstElementChild;
      return { card, before: card.getBoundingClientRect() };
    }));
    row.children[2].querySelector<HTMLElement>('.ranking-action-later').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(row.children[3].firstElementChild).toBe(cards[0].card);
    for (const { card, before } of cards) {
      const animation = card.getAnimations()[0];
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        expect(animation).toBeUndefined();
        continue;
      }
      expect(animation).toBeDefined();
      animation.pause();
      animation.currentTime = 0;
      const start = card.getBoundingClientRect();
      expect(start.left).toBeCloseTo(before.left, 0);
      expect(start.top).toBeCloseTo(before.top, 0);
      animation.finish();
      const end = card.getBoundingClientRect();
      expect(Math.abs(nav ? end.left - start.left : end.top - start.top)).toBeGreaterThan(5);
    }
    await new Promise(requestAnimationFrame);
    strips.forEach((strip, index) => {
      const rect = strip.children[1].getBoundingClientRect();
      expect(rect.left).toBeCloseTo(surrounding[index].left, 0);
      expect(rect.top).toBeCloseTo(surrounding[index].top, 0);
    });
  });

  it('reveals the decoded preview before fading in the full image', async () => {
    const image = state.images[0];
    image.contentLink = state.images[1].contentLink;
    let showPreview: () => void;
    let showOriginal: () => void;
    const previewDecoded = new Promise<void>(resolve => showPreview = resolve);
    const originalDecoded = new Promise<void>(resolve => showOriginal = resolve);
    spyOn(HTMLImageElement.prototype, 'decode').and.callFake(function (this: HTMLImageElement) {
      return this.src === image.contentLink ? originalDecoded : previewDecoded;
    });
    fixture.detectChanges();
    const card = row.firstElementChild;
    const [preview, original] = Array.from(card.querySelectorAll('img'));
    expect(card.textContent.trim()).toBe('');
    expect([preview.alt, original.alt]).toEqual(['', '']);
    expect(getComputedStyle(preview).opacity).toBe('0');
    expect(getComputedStyle(original).opacity).toBe('0');
    preview.dispatchEvent(new Event('load'));
    original.dispatchEvent(new Event('load'));
    showPreview();
    await previewDecoded;
    expect(preview.classList.contains('loaded')).toBeTrue();
    expect(original.classList.contains('loaded')).toBeFalse();
    showOriginal();
    await originalDecoded;
    expect(original.classList.contains('loaded')).toBeTrue();
    expect(getComputedStyle(original).transitionProperty).toContain('opacity');
  });

  it('keeps failed images hidden and skips the original in reduced-data mode', async () => {
    state.images[0].contentLink = state.images[1].contentLink;
    TestBed.inject(ApplicationService).reduceDataUsage = true;
    spyOn(HTMLImageElement.prototype, 'decode').and.rejectWith(new Error('Cannot decode'));
    fixture.detectChanges();
    const images = row.firstElementChild.querySelectorAll('img');
    expect(images.length).toBe(1);
    expect(images[0].src).toBe(state.images[0].thumbnailLink);
    images[0].dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(getComputedStyle(images[0]).opacity).toBe('0');
  });

  if (ScreenUtils.isLargeScreen()) {
    it('shows the controls of the image under a stationary pointer after a swap', async () => {
      fixture.componentInstance.scrollToSubject('image:3');
      const clicked = row.children[3].querySelector<HTMLElement>('.ranking-action-later');
      const incoming = row.children[4].querySelector<HTMLElement>('.ranking-action-later');
      const bounds = clicked.getBoundingClientRect();
      const point = { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 };
      clicked.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', ...point }));
      expect(getComputedStyle(clicked).pointerEvents).toBe('auto');
      clicked.click();
      fixture.detectChanges();
      await fixture.whenStable();
      await Promise.all(row.getAnimations({ subtree: true }).map(animation => animation.finished));
      await new Promise(requestAnimationFrame);
      expect(document.elementFromPoint(point.clientX, point.clientY)?.closest('.chain-segment')).toBe(incoming.parentElement);
      expect(getComputedStyle(clicked).pointerEvents).toBe('none');
      expect(getComputedStyle(incoming).pointerEvents).toBe('auto');
    });

    it('keeps both strips still at unequal-width ends and resumes thumbnail navigation', async () => {
      for (const [from, neighbor] of [[0, 1], [19, 18]]) {
        fixture.componentInstance.scrollToSubject('image:' + from);
        const strips = [row, nav];
        const stationary = from === 0 ? 2 : 17;
        const before = strips.map(strip => strip.children[stationary].getBoundingClientRect().left);
        row.children[from].querySelector<HTMLElement>(from < neighbor ? '.ranking-action-later' : '.ranking-action-earlier').click();
        fixture.detectChanges();
        await fixture.whenStable();
        await new Promise(requestAnimationFrame);
        strips.forEach((strip, index) => expect(strip.children[stationary].getBoundingClientRect().left).toBeCloseTo(before[index], 0));
      }
      nav.children[12].querySelector('button').click();
      await Promise.all([waitForCenter(row, 12), waitForCenter(nav, 12)]);
    });

    async function waitForCenter(strip: HTMLElement, index: number): Promise<void> {
      const deadline = performance.now() + 2500;
      const offset = () => {
        const rect = strip.children[index].getBoundingClientRect();
        return rect.left + rect.width / 2 - strip.getBoundingClientRect().left - strip.clientWidth / 2;
      };
      while (Math.abs(offset()) > 1.5 && performance.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 16));
      }
      expect(Math.abs(offset())).withContext(`${strip.className} image ${index}`).toBeLessThanOrEqual(1.5);
    }

    it('shows 120px of each loaded thumbnail from the top through the bottom of the navigator', async () => {
      const deadline = performance.now() + 2000;
      while ((!nav.children[0].querySelector('img.loaded') || !nav.children[1].querySelector('img.loaded')) && performance.now() < deadline) {
        await new Promise(requestAnimationFrame);
        fixture.detectChanges();
      }
      // Hit-test after the newly visible layers have been painted.
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const images = [0, 1].map(index => nav.children[index].querySelector('img'));
      const [wide, narrow] = images.map(image => image.getBoundingClientRect());
      expect(nav.scrollWidth).toBeGreaterThan(nav.clientWidth);
      expect(getComputedStyle(nav).overflowX).toBe('auto');
      expect(wide.height).toBe(120);
      expect(nav.clientHeight).toBe(wide.height);
      expect(wide.height).toBe(narrow.height);
      expect(wide.width / narrow.width).toBeCloseTo(2, 2);
      expect(nav.children[0].getBoundingClientRect().width).toBe(wide.width);
      expect(nav.children[1].getBoundingClientRect().width).toBe(narrow.width);
      const bounds = nav.getBoundingClientRect();
      for (const image of images) {
        const rect = image.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        expect(document.elementFromPoint(x, bounds.top + 1)).toBe(image);
        expect(rect.bottom).toBeCloseTo(bounds.top + nav.clientHeight, 1);
        expect(image.parentElement.getBoundingClientRect().bottom).toBeCloseTo(rect.bottom, 1);
      }
    });

    it('centers the first, last and interior images in both rows', async () => {
      expect(nav.scrollWidth).toBeGreaterThan(nav.clientWidth);
      await Promise.all([waitForCenter(row, 0), waitForCenter(nav, 0)]);
      for (const index of [8, 7, 19, 0]) {
        const strips = [row, nav];
        const starts = strips.map(strip => strip.scrollLeft);
        const samples: number[][] = [];
        let frame: number;
        const sample = () => {
          samples.push(strips.map((strip, i) => strip.scrollLeft - starts[i]));
          frame = requestAnimationFrame(sample);
        };
        sample();
        nav.children[index].querySelector('button').click();
        fixture.detectChanges();
        try {
          await Promise.all(strips.map(strip => waitForCenter(strip, index)));
        } finally {
          cancelAnimationFrame(frame);
        }
        const distances = strips.map((strip, i) => strip.scrollLeft - starts[i]);
        const furthest = [0, 0];
        for (const offsets of samples) {
          offsets.forEach((offset, i) => {
            const traveled = Math.sign(distances[i]) * offset;
            expect(traveled).toBeGreaterThanOrEqual(furthest[i] - 1);
            furthest[i] = Math.max(furthest[i], traveled);
          });
          expect(Math.abs(offsets[0] / distances[0] - offsets[1] / distances[1])).toBeLessThan(0.025);
        }
        expect(row.children[index].getBoundingClientRect().height).toBeGreaterThan(nav.children[index].getBoundingClientRect().height);
      }
      expect(state.fullscreenImage()).toBeNull();
    });

    function wheel(strip: HTMLElement, deltaY: number): void {
      const event = new WheelEvent('wheel', { deltaY, cancelable: true });
      strip.dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
    }

    it('keeps one standard gap in both rows and centers matching panoramas', () => {
      for (const i of [0, 7, 19]) state.images[i].aspectRatio = 6;
      fixture.detectChanges();
      const gap = parseFloat(getComputedStyle(document.documentElement).fontSize) / 3;
      for (const strip of [row, nav]) {
        const cards = Array.from(strip.children, item => item.getBoundingClientRect());
        for (let i = 1; i < cards.length; i++) {
          expect(Math.abs(cards[i].left - cards[i - 1].right - gap)).toBeLessThan(0.05);
        }
      }
      fixture.componentInstance.scrollToSubject('image:7');
      for (const strip of [row, nav]) {
        const card = strip.children[7].getBoundingClientRect();
        const center = strip.getBoundingClientRect().left + strip.clientWidth / 2;
        expect(Math.abs(card.left + card.width / 2 - center)).toBeLessThan(1.5);
      }
    });

    it('mirrors native scroll progress at both ends and in the middle', () => {
      for (const [source, target] of [[row, nav], [nav, row]]) {
        source.dispatchEvent(new PointerEvent('pointerdown'));
        source.style.scrollSnapType = 'none'; // Sample between snap points, as during a scrollbar drag.
        const range = source.scrollWidth - source.clientWidth;
        for (const fraction of [0.01, 0.02, 0.5, 0.98, 0.99]) {
          source.scrollTo({ left: fraction * range, behavior: 'instant' });
          source.dispatchEvent(new Event('scroll'));
          const scale = (target.scrollWidth - target.clientWidth) / range;
          // Each scrollbar can round its position to a device pixel.
          expect(Math.abs(target.scrollLeft - source.scrollLeft * scale)).toBeLessThanOrEqual((scale + 1) / devicePixelRatio);
        }
        source.style.removeProperty('scroll-snap-type');
      }
    });

    it('can wheel to the second and penultimate images from either side in either row', async () => {
      for (const strip of [row, nav]) {
        for (const [from, to] of [[0, 1], [2, 1], [19, 18], [17, 18]]) {
          fixture.componentInstance.scrollToSubject('image:' + from);
          wheel(strip, Math.sign(to - from) * 100);
          await Promise.all([waitForCenter(row, to), waitForCenter(nav, to)]);
        }
      }
    }, 12000);

    it('accumulates a burst of wheel input while snapping across images', async () => {
      const index = 8;
      const item = nav.children[index] as HTMLElement;
      const first = nav.firstElementChild as HTMLElement;
      const distance = item.offsetLeft - first.offsetLeft + (item.offsetWidth - first.offsetWidth) / 2 - 10;
      for (let i = 0; i < 10; i++) wheel(nav, (distance / 0.5) / 10);
      await Promise.all([waitForCenter(row, index), waitForCenter(nav, index)]);
      for (let i = 0; i < 10; i++) wheel(row, -row.scrollWidth / 10);
      await Promise.all([waitForCenter(row, 0), waitForCenter(nav, 0)]);
      const zoom = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true });
      row.dispatchEvent(zoom);
      expect(zoom.defaultPrevented).toBeFalse();
    });

    it('lets the wheel interrupt a thumbnail click and reverse an unfinished wheel movement', async () => {
      nav.lastElementChild.querySelector('button').click();
      const deadline = performance.now() + 1500;
      while (nav.scrollLeft < 100 && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 16));
      expect(nav.scrollLeft).toBeGreaterThan(0);
      wheel(row, row.scrollWidth);
      await new Promise(resolve => setTimeout(resolve, 32));
      wheel(row, -row.scrollWidth);
      await Promise.all([waitForCenter(row, 0), waitForCenter(nav, 0)]);
    });

    it('keeps both rows moving in one direction under sustained wheel input', async () => {
      for (const strip of [nav, row]) {
        const direction = strip === nav ? 1 : -1;
        const destination = direction > 0 ? strip.children.length - 1 : 0;
        const furthest = [row.scrollLeft, nav.scrollLeft].map(left => left * direction);
        let backtrack = 0;
        let frame = 0;
        const sample = () => {
          [row, nav].forEach((element, i) => {
            const progress = element.scrollLeft * direction;
            backtrack = Math.max(backtrack, furthest[i] - progress);
            furthest[i] = Math.max(furthest[i], progress);
          });
          frame = requestAnimationFrame(sample);
        };
        sample();
        try {
          for (let i = 0; i < 36; i++) {
            wheel(strip, direction * 180);
            await new Promise(resolve => setTimeout(resolve, 32));
            if (i === 17) {
              const middle = strip.children[8].getBoundingClientRect();
              const center = strip.getBoundingClientRect().left + strip.clientWidth / 2;
              expect(direction * (center - middle.left - middle.width / 2)).toBeGreaterThan(0);
            }
          }
          await Promise.all([waitForCenter(row, destination), waitForCenter(nav, destination)]);
          expect(backtrack).withContext(strip.className).toBeLessThanOrEqual(1.5);
        } finally {
          cancelAnimationFrame(frame);
        }
      }
    }, 12000);

    it('immediately targets an image on each wheel gesture using the sensitivity of the active row', async () => {
      let startRank = 0;
      for (const strip of [row, nav]) {
        const start = strip.scrollLeft;
        const distance = strip === row ? 1800 : 300;
        const centers = Array.from(strip.children, (item: HTMLElement) => item.offsetLeft + (item.offsetWidth - strip.clientWidth) / 2);
        const index = centers.findIndex(left => left >= centers[startRank] + distance);
        wheel(strip, 600);
        await new Promise(resolve => setTimeout(resolve, 80));
        expect(strip.scrollLeft).toBeGreaterThan(start);
        await Promise.all([waitForCenter(row, index), waitForCenter(nav, index)]);
        startRank = index;
      }
    });

    it('moves the other row between matching centers during scrolling in either direction', async () => {
      for (const strip of [nav, row]) {
        const other = strip === nav ? row : nav;
        const index = strip === nav ? 4 : 7;
        const item = strip.children[index] as HTMLElement;
        const target = item.offsetLeft + (item.offsetWidth - strip.clientWidth) / 2;
        const center = (element: Element, scroller: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return rect.left + rect.width / 2 - scroller.getBoundingClientRect().left - scroller.clientWidth / 2;
        };
        let sawIntermediatePosition = false;
        const checkPosition = () => {
          const upper = Array.from(strip.children).findIndex(child => center(child, strip) > 0);
          if (upper < 1 || [row, nav].some(scroller => {
            const lower = scroller.children[upper - 1] as HTMLElement;
            return lower.offsetLeft + lower.offsetWidth / 2 <= scroller.clientWidth / 2;
          })) return;
          const progress = (scroller: HTMLElement) => {
            const start = center(scroller.children[upper - 1], scroller);
            return -start / (center(scroller.children[upper], scroller) - start);
          };
          const fraction = progress(strip);
          if (fraction > 0.05 && fraction < 0.95) {
            sawIntermediatePosition = true;
            expect(Math.abs(progress(other) - fraction)).toBeLessThan(0.025);
          }
        };
        strip.addEventListener('scroll', checkPosition);
        strip.dispatchEvent(new PointerEvent('pointerdown'));
        strip.scrollTo({ left: target + 12 });
        await Promise.all([waitForCenter(strip, index), waitForCenter(other, index)]);
        strip.removeEventListener('scroll', checkPosition);
        if (matchMedia('(prefers-reduced-motion: no-preference)').matches) expect(sawIntermediatePosition).toBeTrue();
      }
    });

    it('reflects reordering, removal and filtering in both rows', () => {
      const expectImages = (names: string[]) => {
        expect(Array.from(row.querySelectorAll('[role="img"]'), image => image.getAttribute('aria-label'))).toEqual(names);
        expect(Array.from(nav.querySelectorAll('button'), button => button.getAttribute('aria-label')))
          .toEqual(names.map((name, i) => `Show ${name}, rank ${i + 1}`));
      };
      state.images.forEach((image, index) => image.passesComparisonFilter = index < 3);
      fixture.componentRef.setInput('showOnlyFilteredImages', true);
      fixture.detectChanges();
      expectImages(['Image 0', 'Image 1', 'Image 2']);
      row.querySelector<HTMLElement>('.ranking-action-later').click();
      fixture.detectChanges();
      expectImages(['Image 1', 'Image 0', 'Image 2']);
      row.querySelector<HTMLElement>('.rank-again-button').click();
      fixture.detectChanges();
      expectImages(['Image 0', 'Image 2']);
      state.images.forEach(image => image.passesComparisonFilter = false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.rank-navigator')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('No ranked images match');
    });
  } else {
    it('shows touch controls along the scroll direction and the thumbnail navigator in landscape', () => {
      const portrait = matchMedia('(orientation: portrait)').matches;
      expect(!!nav).toBe(!portrait);
      expect(getComputedStyle(row).flexDirection).toBe(portrait ? 'column' : 'row');
      if (nav) {
        expect(nav.clientHeight).toBe(60);
        const thumbnail = nav.querySelector('img').getBoundingClientRect();
        expect(thumbnail.height).toBe(60);
        expect(thumbnail.width / thumbnail.height).toBeCloseTo(state.images[0].aspectRatio, 2);
      }
      const card = row.children[1];
      const earlier = card.querySelector<HTMLElement>('.ranking-action-earlier');
      const later = card.querySelector<HTMLElement>('.ranking-action-later');
      for (const control of [earlier, later, card.querySelector('.rank-again-button')]) {
        expect(getComputedStyle(control).opacity).toBe('1');
        expect(getComputedStyle(control).pointerEvents).toBe('auto');
      }
      const up = earlier.getBoundingClientRect();
      const down = later.getBoundingClientRect();
      if (portrait) {
        const bounds = card.getBoundingClientRect();
        expect(up.left).toBeCloseTo(down.left, 1);
        expect(up.left + up.width / 2).toBeCloseTo(bounds.left + bounds.width / 2, 1);
        expect(up.top - bounds.top).toBeCloseTo(bounds.bottom - down.bottom, 1);
        expect(up.bottom).toBeLessThan(down.top);
        expect(getComputedStyle(earlier, '::before').transform).not.toBe('none');
      } else {
        expect(up.top).toBeCloseTo(down.top, 1);
        expect(up.right).toBeLessThan(down.left);
      }
      earlier.click();
      fixture.detectChanges();
      expect(row.firstElementChild).toBe(card);
      later.click();
      fixture.detectChanges();
      expect(row.children[1]).toBe(card);
      card.querySelector<HTMLElement>('.chain-image').click();
      expect(state.fullscreenImage()).toBe(state.images[1]);
    });
  }
});
