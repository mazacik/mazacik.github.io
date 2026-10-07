import { Component, EventEmitter, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { DialogService } from '../../../shared/services/dialog.service';
import { GalleryImage } from '../../models/gallery-image.class';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { ImageTournamentComponent } from './image-tournament.component';
import { BinaryInsertionSort } from '../../../shared/classes/binary-insertion-sort.class';
import { GallerySortUtils } from '../../utils/gallery-sort.utils';
import { ImageRankingRowComponent } from './image-ranking-row.component';
import { GalleryFeatures } from '../../constants/gallery-features';

@Component({
  selector: 'app-image',
  template: '',
  inputs: ['src', 'placeholderSrc', 'sourceWidth', 'sourceHeight'],
  outputs: ['imageDisplayed']
})
class TestImageComponent {
  public readonly imageDisplayed = new EventEmitter<string>();
}

describe('ImageTournamentComponent ranked-row integration', () => {
  let fixture: ComponentFixture<ImageTournamentComponent>;
  let component: ImageTournamentComponent;
  let state: GalleryStateService;
  let sort: BinaryInsertionSort;
  let save: jasmine.Spy;
  let widthDescriptor: PropertyDescriptor;
  let rankedColumnPlacementEnabled: boolean;

  function setWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    window.dispatchEvent(new Event('resize'));
  }

  beforeEach(async () => {
    rankedColumnPlacementEnabled = GalleryFeatures.rankedColumnPlacement;
    GalleryFeatures.rankedColumnPlacement = true;
    widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    setWidth(1280);
    const contentLink = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>';
    const images = Array.from({ length: 12 }, (_, index) => Object.assign(new GalleryImage(), {
      id: `${index}`, name: `${index}.jpg`, mimeType: 'image/jpeg', contentLink, thumbnailLink: contentLink
    }));
    const ids = images.map(image => GallerySortUtils.getSortSubjectId(image));
    sort = new BinaryInsertionSort();
    sort.start(ids, {
      rankedImageIds: ids.slice(0, 10), pendingImageIds: [ids[11]],
      activeInsertion: { imageId: ids[10], low: 1, high: 2 }
    });
    save = jasmine.createSpy('save');
    state = {
      settings: { showComparisonRelations: true, showComparisonProgress: true, useRankedRow: false },
      images, imageGroups: [], imageSort: sort, sortState: sort.getState(), fullscreenImage: signal(null)
    } as unknown as GalleryStateService;
    await TestBed.configureTestingModule({
      imports: [ImageTournamentComponent],
      providers: [
        { provide: DialogService, useValue: {} },
        { provide: GallerySerializationService, useValue: { save } },
        { provide: GalleryStateService, useValue: state }
      ]
    }).overrideComponent(ImageTournamentComponent, {
      remove: { imports: [ImageComponent] }, add: { imports: [TestImageComponent] }
    }).overrideComponent(ImageRankingRowComponent, {
      remove: { imports: [ImageComponent] }, add: { imports: [TestImageComponent] }
    }).compileComponents();
    fixture = TestBed.createComponent(ImageTournamentComponent);
    component = fixture.componentInstance;
    Object.assign(fixture.nativeElement.style, { width: '1280px', height: '720px' });
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    GalleryFeatures.rankedColumnPlacement = rankedColumnPlacementEnabled;
    Object.defineProperty(window, 'innerWidth', widthDescriptor);
  });

  it('uses pairwise when ranked-column placement is unavailable despite a saved preference', () => {
    GalleryFeatures.rankedColumnPlacement = false;
    state.settings.useRankedRow = true;
    component.refreshComparisonRelations();
    fixture.detectChanges();

    expect(component.isRankedRowMode).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-image-ranking-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('.comparison-column')).not.toBeNull();
    expect(state.settings.useRankedRow).toBeTrue();
  });

  it('rejects enabling and placement while ranked-column placement is unavailable', () => {
    GalleryFeatures.rankedColumnPlacement = false;
    const before = sort.getState();
    component.setRankedRowMode(true);
    (component as any).placeInRankedRow({ subjectId: 'image:10', index: 10 });
    fixture.detectChanges();

    expect(state.settings.useRankedRow).toBeFalse();
    expect(sort.getState()).toEqual(before);
    expect(save).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-image-ranking-row')).toBeNull();
  });

  for (const mobile of [true, false]) {
    for (const column of ['winners', 'losers']) {
      it(`changes the opponent from a ${column} thumbnail ${mobile ? 'tap on mobile' : 'left click on desktop'}`, () => {
        spyOn(window, 'matchMedia').and.returnValue({ matches: mobile } as MediaQueryList);
        component.resetActiveImage();
        fixture.detectChanges();
        save.calls.reset();
        const before = sort.getState();
        const target = column === 'winners' ? state.images[4] : state.images[6];
        const thumbnail = fixture.nativeElement.querySelector(`.${column}-column .side-image`) as HTMLImageElement;
        (component as any).comparisonImagesReady = [true, true];

        if (mobile) {
          thumbnail.dispatchEvent(new Event('touchstart'));
          thumbnail.dispatchEvent(new Event('touchend'));
        }
        thumbnail.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
        fixture.detectChanges();

        expect(sort.currentComparisonIds).toEqual(['image:10', GallerySortUtils.getSortSubjectId(target)]);
        expect((component as any).comparison[1]).toBe(target);
        expect((component as any).comparisonImagesReady).toEqual([true, false]);
        expect(state.fullscreenImage()).toBeNull();
        expect(sort.getState()).toEqual(before);
        expect(save).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('.side-image-action')).toBeNull();
      });
    }
  }

  it('opens a relation thumbnail fullscreen on desktop right click without changing the opponent', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    component.resetActiveImage();
    fixture.detectChanges();
    const before = sort.currentComparisonIds;
    const thumbnail = fixture.nativeElement.querySelector('.losers-column .side-image') as HTMLImageElement;
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });

    thumbnail.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(state.fullscreenImage()).toBe(state.images[6]);
    expect(sort.currentComparisonIds).toEqual(before);
  });

  it('keeps a long press from also switching the opponent on the following click', fakeAsync(() => {
    component.resetActiveImage();
    fixture.detectChanges();
    const before = sort.currentComparisonIds;
    const thumbnail = fixture.nativeElement.querySelector('.winners-column .side-image') as HTMLImageElement;

    thumbnail.dispatchEvent(new Event('touchstart'));
    tick(501);
    thumbnail.dispatchEvent(new Event('touchend'));
    thumbnail.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(state.fullscreenImage()).toBe(state.images[4]);
    expect(sort.currentComparisonIds).toEqual(before);
  }));

  it('keeps pairwise as default and preserves its narrowed interval when toggling', () => {
    const before = sort.getState();
    expect(fixture.nativeElement.querySelector('.comparison-column')).not.toBeNull();
    component.setRankedRowMode(true);
    fixture.detectChanges();
    expect(state.settings.useRankedRow).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-image-ranking-row')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.comparison-column')).toBeNull();
    expect(fixture.nativeElement.querySelector('.side-column')).toBeNull();
    expect(sort.getState()).toEqual(before);
    component.setRankedRowMode(false);
    fixture.detectChanges();
    expect(sort.getState()).toEqual(before);
    expect(fixture.nativeElement.querySelector('.comparison-column')).not.toBeNull();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('places anywhere, saves once, advances without a consistency check, and rejects duplicate placement', () => {
    component.setRankedRowMode(true);
    fixture.detectChanges();
    save.calls.reset();
    const placement = { subjectId: 'image:10', index: 10 };
    (component as any).placeInRankedRow(placement);
    (component as any).placeInRankedRow(placement);
    fixture.detectChanges();
    expect(sort.rankedImageIds[10]).toBe('image:10');
    expect(sort.activeInsertion.imageId).toBe('image:11');
    expect(state.sortState).toEqual(sort.getState());
    expect(save).toHaveBeenCalledOnceWith(true);
    expect((component as any).isConsistencyCheckActive).toBeFalse();
  });

  it('places a queued destination, protects the next image from a double-click, and cancels old scroll work', async () => {
    component.setRankedRowMode(true);
    fixture.detectChanges();
    save.calls.reset();
    const button = fixture.nativeElement.querySelector('.placement-button') as HTMLButtonElement;
    const scroller = fixture.nativeElement.querySelector('.ranked-scroller') as HTMLElement;
    for (let step = 0; step < 2; step++) scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true }));
    expect(button.disabled).toBeFalse();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    fixture.detectChanges();
    expect(sort.rankedImageIds[7]).toBe('image:10');
    expect(sort.activeInsertion.imageId).toBe('image:11');
    expect(save).toHaveBeenCalledOnceWith(true);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
    await new Promise(resolve => window.setTimeout(resolve, 600));
    fixture.detectChanges();
    expect(sort.activeInsertion.imageId).toBe('image:11');
    expect(save).toHaveBeenCalledTimes(1);
    const gap = scroller.querySelectorAll('.insertion-gap')[5].getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    expect(Math.abs(gap.top + gap.height / 2 - viewport.top - scroller.clientHeight / 2)).toBeLessThanOrEqual(1);
    expect((component as any).isConsistencyCheckActive).toBeFalse();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    fixture.detectChanges();
    expect(sort.rankedImageIds[5]).toBe('image:11');
    expect(sort.activeInsertion).toBeNull();
    expect(save).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.comparison-empty').textContent).toContain('Ranking complete.');
  });

  it('keeps footer progress below the image and column and updates its placement marker', async () => {
    component.setRankedRowMode(true);
    fixture.detectChanges();
    await new Promise(resolve => window.setTimeout(resolve, 250));
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('.progress-remaining') as HTMLElement;
    const image = fixture.nativeElement.querySelector('.active-image').getBoundingClientRect();
    const column = fixture.nativeElement.querySelector('.ranked-column').getBoundingClientRect();
    expect(footer.getBoundingClientRect().top).toBeGreaterThanOrEqual(image.bottom);
    expect(footer.getBoundingClientRect().top).toBeGreaterThanOrEqual(column.bottom);
    expect(footer.getBoundingClientRect().width).toBe(1280);
    expect(footer.querySelector('.progress-remaining-text').textContent).toBe('10/12');
    const progress = (footer.querySelector('.progress-remaining-bar') as HTMLElement).style.width;
    const marker = footer.querySelector('.placement-point') as HTMLElement;
    expect(marker.style.left).toBe('50%');
    fixture.nativeElement.querySelector('.ranked-scroller').dispatchEvent(new WheelEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true }));
    await new Promise(resolve => window.setTimeout(resolve, 500));
    fixture.detectChanges();
    expect(marker.style.left).toBe('60%');
    expect((footer.querySelector('.progress-remaining-bar') as HTMLElement).style.width).toBe(progress);
    expect(sort.activeInsertion.imageId).toBe('image:10');
  });

  it('retains pairwise consistency checks and clears a transient check when entering row mode', async () => {
    (component as any).comparisonImagesReady = [true, true];
    await (component as any).onImageClick(state.images[10]);
    expect((component as any).isConsistencyCheckActive).toBeTrue();
    component.setRankedRowMode(true);
    fixture.detectChanges();
    expect((component as any).isConsistencyCheckActive).toBeFalse();
    expect((component as any).rowActiveImage).toBe(state.images[11]);
  });

  it('uses pairwise below desktop width while retaining the preferred mode', () => {
    component.setRankedRowMode(true);
    fixture.detectChanges();
    setWidth(799);
    fixture.detectChanges();
    expect(component.isRankedRowMode).toBeFalse();
    expect(state.settings.useRankedRow).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-image-ranking-row')).toBeNull();
    setWidth(1024);
    fixture.detectChanges();
    expect(component.isRankedRowMode).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-image-ranking-row')).not.toBeNull();
  });

  it('refreshes a ranked subject whose representative image changes', () => {
    component.setRankedRowMode(true);
    fixture.detectChanges();
    const replacement = Object.assign(new GalleryImage(), state.images[0]);
    state.images[0] = replacement;
    component.refreshComparisonRelations();
    fixture.detectChanges();
    expect((component as any).rankedSubjects[0]).toEqual({ id: 'image:0', image: replacement });
    expect((component as any).rankedSubjects[0].image).toBe(replacement);
  });

  it('supports skip and restart and shows completion after the last placement', () => {
    component.setRankedRowMode(true);
    fixture.detectChanges();
    const event = new MouseEvent('click');
    (component as any).skipActiveImage(event);
    expect(sort.activeInsertion.imageId).toBe('image:11');
    component.resetActiveImage();
    expect(sort.activeInsertion).toEqual({ imageId: 'image:11', low: 0, high: 10 });
    (component as any).placeInRankedRow({ subjectId: 'image:11', index: 0 });
    (component as any).placeInRankedRow({ subjectId: 'image:10', index: 11 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-image-ranking-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('.comparison-empty').textContent).toContain('Ranking complete.');
  });
});

describe('ImageTournamentComponent mobile comparison', () => {
  let fixture: ComponentFixture<ImageTournamentComponent>;
  let component: ImageTournamentComponent;
  let imageA: GalleryImage;
  let imageB: GalleryImage;
  let answer: jasmine.Spy;
  let save: jasmine.Spy;
  let state: GalleryStateService;

  beforeEach(async () => {
    imageA = Object.assign(new GalleryImage(), {
      id: 'a',
      name: 'A.jpg',
      mimeType: 'image/jpeg',
      contentLink: 'a.jpg',
      thumbnailLink: 'a-thumbnail.jpg'
    });
    imageB = Object.assign(new GalleryImage(), {
      id: 'b',
      name: 'B.jpg',
      mimeType: 'image/jpeg',
      contentLink: 'b.jpg',
      thumbnailLink: 'b-thumbnail.jpg'
    });
    answer = jasmine.createSpy('answer');
    save = jasmine.createSpy('save');
    const stateVersion = signal(0);
    const imageSort = {
      stateVersion,
      currentComparisonIds: ['image:a', 'image:b'],
      rankedImageIds: [],
      pendingCountIncludingActive: 2,
      activeInsertion: null,
      answer,
      getState: () => ({}),
      start: jasmine.createSpy('start'),
      getOverlayIds: () => ({ winners: [], losers: [] }),
      canCompareAgainstRankedImage: () => false,
      setComparisonOpponent: () => false,
      resetActiveInsertion: jasmine.createSpy('resetActiveInsertion'),
      skipActiveInsertion: jasmine.createSpy('skipActiveInsertion')
    };
    state = {
      settings: { showComparisonProgress: false, showComparisonRelations: false },
      images: [imageA, imageB],
      imageGroups: [],
      imageSort,
      fullscreenImage: signal(null),
      sortState: null
    } as unknown as GalleryStateService;

    await TestBed.configureTestingModule({
      imports: [ImageTournamentComponent],
      providers: [
        { provide: DialogService, useValue: {} },
        { provide: GallerySerializationService, useValue: { save } },
        { provide: GalleryStateService, useValue: state }
      ]
    }).overrideComponent(ImageTournamentComponent, {
      remove: { imports: [ImageComponent] },
      add: { imports: [TestImageComponent] }
    }).compileComponents();

    fixture = TestBed.createComponent(ImageTournamentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setMobileLayout(matches: boolean): void {
    spyOn(window, 'matchMedia').and.returnValue({ matches } as MediaQueryList);
  }

  function markImagesReady(): void {
    (component as any).comparisonImagesReady = [true, true];
  }

  it('opens a tapped image fullscreen on portrait phones without voting', async () => {
    setMobileLayout(true);
    markImagesReady();

    await (component as any).onComparisonImageClick(imageB);

    expect(state.fullscreenImage()).toBe(imageB);
    expect(answer).not.toHaveBeenCalled();
  });

  it('retains tap-to-vote outside the portrait phone layout', async () => {
    setMobileLayout(false);
    markImagesReady();

    await (component as any).onComparisonImageClick(imageA);

    expect(answer).toHaveBeenCalledOnceWith('image:a');
    expect(save).toHaveBeenCalledWith(true);
  });

  it('tracks the closest vertically snapped comparison page', () => {
    setMobileLayout(true);
    const columns = [{ offsetTop: 20 }, { offsetTop: 420 }];
    const element = {
      scrollTop: 250,
      querySelectorAll: () => columns
    } as unknown as HTMLElement;

    (component as any).onComparisonScroll(element);

    expect((component as any).mobileComparisonIndex).toBe(1);
  });

  it('votes for the page visible when the mobile action is pressed', async () => {
    markImagesReady();
    spyOn<any>(component, 'getClosestComparisonIndex').and.returnValue(1);
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation')
    } as unknown as MouseEvent;

    await (component as any).chooseCurrentComparisonImage(event);

    expect(answer).toHaveBeenCalledOnceWith('image:b');
    expect((component as any).mobileComparisonIndex).toBe(1);
  });

  it('keeps the current page after an ordinary vote', async () => {
    markImagesReady();
    (component as any).mobileComparisonIndex = 1;

    await (component as any).onImageClick(imageB);

    expect((component as any).mobileComparisonIndex).toBe(1);
  });

  it('returns to the first page when the ranking is reset', () => {
    (component as any).mobileComparisonIndex = 1;
    const comparison = fixture.nativeElement.querySelector('.comparison') as HTMLElement;
    comparison.scrollTop = 100;

    component.resetSort();

    expect((component as any).mobileComparisonIndex).toBe(0);
    expect(comparison.scrollTop).toBe(0);
  });

  it('returns to the first page when entering comparison mode', () => {
    (component as any).mobileComparisonIndex = 1;
    const comparison = fixture.nativeElement.querySelector('.comparison') as HTMLElement;
    comparison.scrollTop = 100;

    component.onEnterTournament();

    expect((component as any).mobileComparisonIndex).toBe(0);
    expect(comparison.scrollTop).toBe(0);
  });

  it('disables the mobile choice until both images are ready and while a consistency warning is open', () => {
    const button = fixture.nativeElement.querySelector('.mobile-comparison-choice') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();

    markImagesReady();
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();

    (component as any).consistencyWarningOpen = true;
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
  });

  it('places the mobile choice above the progress bar', () => {
    state.settings.showComparisonProgress = true;
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('.comparison-wrapper') as HTMLElement;
    const actions = wrapper.querySelector('.mobile-comparison-actions');
    const progress = wrapper.querySelector('.progress-remaining');

    expect(actions.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the other image preview in each comparison page', () => {
    const previews = Array.from(fixture.nativeElement.querySelectorAll('.mobile-other-image-preview')) as HTMLButtonElement[];

    expect(previews.length).toBe(2);
    expect(previews[0].classList).toContain('mobile-other-image-preview-bottom');
    expect(previews[0].querySelector('img').src).toContain('b-thumbnail.jpg');
    expect(previews[1].classList).toContain('mobile-other-image-preview-top');
    expect(previews[1].querySelector('img').src).toContain('a-thumbnail.jpg');
  });

  it('scrolls to the comparison page selected from an image preview', () => {
    const comparison = fixture.nativeElement.querySelector('.comparison') as HTMLElement;
    const columns = Array.from(comparison.querySelectorAll<HTMLElement>(':scope > .comparison-column'));
    const scrollTo = spyOn(comparison, 'scrollTo') as jasmine.Spy;
    spyOnProperty(columns[0], 'offsetTop', 'get').and.returnValue(10);
    spyOnProperty(columns[1], 'offsetTop', 'get').and.returnValue(410);
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation')
    } as unknown as MouseEvent;

    (component as any).showMobileComparisonPage(1, event);

    expect((component as any).mobileComparisonIndex).toBe(1);
    expect(scrollTo).toHaveBeenCalledOnceWith({ top: 400, behavior: 'smooth' });
  });
});
