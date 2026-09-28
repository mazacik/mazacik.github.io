import { Component, EventEmitter, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { DialogService } from '../../../shared/services/dialog.service';
import { GalleryImage } from '../../models/gallery-image.class';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { ImageTournamentComponent } from './image-tournament.component';

@Component({
  selector: 'app-image',
  template: '',
  inputs: ['src', 'placeholderSrc', 'sourceWidth', 'sourceHeight'],
  outputs: ['imageDisplayed']
})
class TestImageComponent {
  public readonly imageDisplayed = new EventEmitter<string>();
}

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
