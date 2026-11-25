import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from '../../../app.component';
import { ApplicationSettingsComponent } from '../../../shared/dialogs/application-settings/application-settings.component';
import { AppConstants } from '../../../shared/constants/app.constants';
import { ApplicationService } from '../../../shared/services/application.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { ScreenUtils } from '../../../shared/utils/screen.utils';
import { GalleryComponent } from '../../gallery.component';
import { ImageTournamentComponent } from '../../dialogs/image-comparison/image-tournament.component';
import { GalleryImage } from '../../models/gallery-image.class';
import { FilterService } from '../../services/filter.service';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { FilterComponent } from '../filter/filter.component';
import { FullscreenComponent } from '../fullscreen/fullscreen.component';
import { HeaderComponent } from './header.component';

describe('Comparison header layout', () => {
  it('navigates fullscreen groups with the previous and next arrows', async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryComponent, HeaderComponent],
      providers: [
        { provide: GalleryGoogleDriveService, useValue: {} },
        { provide: GallerySerializationService, useValue: { processData: async () => {} } }
      ]
    }).overrideComponent(GalleryComponent, { set: { imports: [FullscreenComponent], schemas: [NO_ERRORS_SCHEMA] } }).compileComponents();
    const gallery = TestBed.createComponent(GalleryComponent);
    const header = TestBed.createComponent(HeaderComponent);
    const state = TestBed.inject(GalleryStateService);
    const first = Object.assign(new GalleryImage(), { id: 'first', mimeType: 'image/jpeg' });
    const second = Object.assign(new GalleryImage(), { id: 'second', mimeType: 'image/jpeg' });
    first.group = second.group = { id: 'pair', images: [first, second] };
    state.fullscreenImage.set(first);
    gallery.detectChanges();
    await gallery.whenStable();
    gallery.detectChanges();
    header.detectChanges();
    const buttons = Array.from((gallery.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.group-navigation [title]'));
    expect(buttons.map(button => button.title)).toEqual(['Previous Group Image', 'Next Group Image']);
    expect(header.nativeElement.querySelector('[title="Random Image from Group"]')).toBeNull();
    buttons[1].click();
    expect(state.fullscreenImage()).toBe(second);
    gallery.componentInstance.processKeyboardShortcut(new KeyboardEvent('keydown', { code: 'KeyG' }));
    expect(state.fullscreenImage()).toBe(second);
    gallery.detectChanges();
    buttons[0].click();
    expect(state.fullscreenImage()).toBe(first);
  });

  it('saves the mobile footer preference and positions the header at the appropriate edge', async () => {
    const previous = localStorage.getItem(AppConstants.KEY_SETTINGS);
    try {
      localStorage.setItem(AppConstants.KEY_SETTINGS, JSON.stringify({ darkTheme: false, reduceDataUsage: true }));
      await TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter([])] }).compileComponents();
      const app = TestBed.inject(ApplicationService);
      const setting = app.getApplicationSettings().items.find(item => item.id === 'mobile-header-at-bottom');
      if (setting?.type !== 'toggle') throw new Error('Missing mobile header setting');
      const fixture = TestBed.createComponent(AppComponent);
      const root: HTMLElement = fixture.nativeElement;
      root.style.height = '500px';
      fixture.detectChanges();
      const header = root.querySelector<HTMLElement>('app-header');
      const content = root.querySelector<HTMLElement>('.app-content');
      expect(setting.getValue()).toBeFalse();
      expect(header.getBoundingClientRect().bottom).toBe(content.getBoundingClientRect().top);
      setting.onChange(true);
      fixture.detectChanges();
      if (ScreenUtils.isLargeScreen()) {
        expect(header.getBoundingClientRect().bottom).toBe(content.getBoundingClientRect().top);
      } else {
        expect(header.getBoundingClientRect().top).toBe(content.getBoundingClientRect().bottom);
      }
      expect(new ApplicationService(TestBed.inject(DialogService)).mobileHeaderAtBottom).toBeTrue();
      setting.onChange(false);
      fixture.detectChanges();
      expect(header.getBoundingClientRect().bottom).toBe(content.getBoundingClientRect().top);
    } finally {
      if (previous === null) localStorage.removeItem(AppConstants.KEY_SETTINGS);
      else localStorage.setItem(AppConstants.KEY_SETTINGS, previous);
    }
  });

  it('disables background controls only while Settings is open at mobile widths', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter([])] }).compileComponents();
    const largeScreen = spyOn(ScreenUtils, 'isLargeScreen').and.returnValue(false);
    const app = TestBed.inject(ApplicationService);
    const dialogs = TestBed.inject(DialogService);
    const filterClick = jasmine.createSpy('toggle filter');
    const filterEdit = jasmine.createSpy('edit filter');
    app.addHeaderButton('center', { id: 'filter', tooltip: 'Filter', classes: 'fa-filter', onClick: filterClick, onContextMenu: filterEdit });
    app.addHeaderButton('end', { id: 'settings', tooltip: 'Settings', classes: 'fa-gear', onClick: () => dialogs.create(ApplicationSettingsComponent) });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const header = root.querySelector<HTMLElement>('app-header');
    const content = root.querySelector<HTMLElement>('.app-content');
    const filter = header.querySelector<HTMLElement>('[title="Filter"]');
    header.querySelector<HTMLElement>('[title="Settings"]').click();
    fixture.detectChanges();
    expect(header.inert && content.inert).toBeTrue();
    expect(header.querySelectorAll('.icon-button.disabled').length).toBe(2);
    filter.click();
    filter.dispatchEvent(new MouseEvent('contextmenu'));
    expect(filterClick).not.toHaveBeenCalled();
    expect(filterEdit).not.toHaveBeenCalled();

    largeScreen.and.returnValue(true);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(header.inert || content.inert).toBeFalse();
    filter.click();
    expect(filterClick).toHaveBeenCalledTimes(1);

    largeScreen.and.returnValue(false);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    const settings = document.querySelector('app-application-settings');
    expect(settings.closest('[inert]')).toBeNull();
    const tabs = settings.querySelector('.tabs');
    expect(getComputedStyle(settings.querySelector('.settings-layout')).flexDirection).toBe('row');
    expect(getComputedStyle(tabs).flexDirection).toBe('column');
    settings.closest('app-dialog-container').querySelector<HTMLElement>('.buttons .button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(header.inert || content.inert).toBeFalse();
    expect(header.querySelectorAll('.icon-button.disabled').length).toBe(0);
  });

  it('groups navigation and filter controls in Masonry, Comparison and Results at narrow and wide widths', async () => {
    const openImageGroupEditor = jasmine.createSpy('openImageGroupEditor');
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, GalleryComponent],
      providers: [
        { provide: GallerySerializationService, useValue: { processData: async () => {} } },
        { provide: GalleryService, useValue: { openImageGroupEditor } }
      ]
    }).overrideComponent(GalleryComponent, { set: { template: '', imports: [] } }).compileComponents();

    const state = TestBed.inject(GalleryStateService);
    state.filterVisible = false;
    TestBed.createComponent(GalleryComponent).detectChanges();
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const header: HTMLElement = fixture.nativeElement;
    header.style.boxSizing = 'border-box';
    header.style.width = '320px';
    const visibleTitles = (section: string) => Array.from(header.querySelectorAll<HTMLElement>(`.header-${section} [title]`))
      .filter(button => button.getBoundingClientRect().width > 0).map(button => button.title);

    const regions = Array.from(header.querySelectorAll<HTMLElement>('.header-region'));
    expect(regions.length).toBe(5);
    const regionPositions = () => regions.map(region => region.getBoundingClientRect().left);
    const expectEqualRegions = () => {
      const width = regions[0].getBoundingClientRect().width;
      for (const region of regions) expect(region.getBoundingClientRect().width).toBeCloseTo(width, 1);
      expect(visibleTitles('start-center')).toEqual([]);
    };
    expectEqualRegions();
    expect(visibleTitles('center-end')).toEqual([]);
    const initialPositions = regionPositions();
    expect(visibleTitles('start')).toEqual(['Open Comparison', 'Create Image Group']);
    expect(visibleTitles('center')).toEqual(['Open Filter']);
    const right = visibleTitles('end');
    const filterTitles = ['Open Filter Editor'];
    const openComparison = header.querySelector<HTMLElement>('[title="Open Comparison"]');
    const createGroup = header.querySelector<HTMLElement>('[title="Create Image Group"]');
    const openFilter = header.querySelector<HTMLElement>('[title="Open Filter"]');
    expect(openFilter.getAttribute('data-count')).toBe('0');
    const filterStyle = getComputedStyle(openFilter);
    expect(filterStyle.flexDirection).toBe('column-reverse');
    expect(filterStyle.justifyContent).toBe('center');
    expect(getComputedStyle(openFilter, '::after').position).toBe('static');
    TestBed.inject(FilterService).masonry.images.set([new GalleryImage(), new GalleryImage()]);
    fixture.detectChanges();
    expect(openFilter.getAttribute('data-count')).toBe('2');
    const largeScreen = spyOn(ScreenUtils, 'isLargeScreen').and.returnValue(false);
    state.groupEditorGroup = { id: undefined, images: [] };
    fixture.detectChanges();
    expect(openComparison.classList.contains('disabled')).toBeTrue();
    expect(createGroup.classList.contains('disabled')).toBeTrue();
    createGroup.click();
    expect(openImageGroupEditor).not.toHaveBeenCalled();
    openComparison.click();
    expect(state.viewMode).toBe('masonry');
    expect(openFilter.classList.contains('disabled')).toBeTrue();
    openFilter.click();
    expect(state.filterVisible).toBeFalse();
    largeScreen.and.returnValue(true);
    fixture.detectChanges();
    expect(openFilter.classList.contains('disabled')).toBeFalse();
    largeScreen.and.returnValue(false);
    state.groupEditorGroup = null;
    fixture.detectChanges();
    expect(openComparison.classList.contains('disabled')).toBeFalse();
    expect(createGroup.classList.contains('disabled')).toBeFalse();
    createGroup.click();
    expect(openImageGroupEditor).toHaveBeenCalledTimes(1);
    openFilter.click();
    expect(state.filterVisible).toBeTrue();
    fixture.detectChanges();
    header.querySelector<HTMLElement>('[title="Close Filter"]').click();
    fixture.detectChanges();
    header.querySelector<HTMLElement>('[title="Open Comparison"]').click();
    fixture.detectChanges();
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
    expect(regionPositions()).toEqual(initialPositions);
    expect(visibleTitles('start')).toEqual(['Back to Gallery', 'Open Ranking', 'Consistency Checks Only']);
    expect(visibleTitles('center')).toEqual(filterTitles);
    expect(header.querySelector<HTMLElement>('[title="Open Filter Editor"]').getAttribute('data-count')).toBe('0');
    expect(visibleTitles('end')).toEqual(right);
    const settings = TestBed.inject(ApplicationService).getRegisteredModuleSettings().find(module => module.id === 'comparison-settings');
    expect(settings.items.map(item => item.id)).toEqual(jasmine.arrayContaining(['show-comparison-relations', 'show-comparison-progress']));

    header.style.width = '800px';
    expectEqualRegions();
    expect(visibleTitles('center')).toEqual(filterTitles);
    expect(visibleTitles('center-end')).toEqual(['Show Comparison Progress', 'Show Comparison Relations']);
    header.querySelector<HTMLElement>('[title="Open Ranking"]').click();
    fixture.detectChanges();
    expect(visibleTitles('start')).toEqual(['Back to Comparison']);
    expect(visibleTitles('center')).toEqual(filterTitles);
    expect(visibleTitles('end')).toEqual(right);
  });

  it('applies edits immediately in Comparison and Results while the filter stays open', async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, GalleryComponent],
      providers: [
        { provide: GallerySerializationService, useValue: { processData: async () => {}, save: () => {} } },
        { provide: GalleryService, useValue: {} }
      ]
    }).overrideComponent(GalleryComponent, { set: { imports: [FilterComponent, ImageTournamentComponent], schemas: [NO_ERRORS_SCHEMA] } }).compileComponents();
    const state = TestBed.inject(GalleryStateService);
    const desktop = ScreenUtils.isLargeScreen();
    state.filterVisible = desktop;
    const gallery = TestBed.createComponent(GalleryComponent);
    const header = TestBed.createComponent(HeaderComponent);
    document.body.append(gallery.nativeElement);
    const render = () => { gallery.detectChanges(); header.detectChanges(); };
    render();
    await gallery.whenStable();
    render();
    const action = (selector: string): HTMLElement => header.nativeElement.querySelector(selector);
    const panel: HTMLElement = gallery.nativeElement.querySelector('app-filter');
    const filters = TestBed.inject(FilterService);
    const thumbnailLink = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    const image = (id: string, heart: boolean) => Object.assign(new GalleryImage(), { id, heart, mimeType: 'image/gif', thumbnailLink });
    const favorite = image('favorite', true);
    const other = image('other', false);
    const ranked = image('ranked', false);
    state.images.push(favorite, other, ranked);
    state.sortState = {
      rankedImageIds: ['image:ranked'], pendingImageIds: ['image:favorite'],
      activeInsertion: { imageId: 'image:other', low: 0, high: 1 }
    };
    filters.updateFilters();
    const results = gallery.nativeElement.querySelector('app-image-tournament-longest-chain');
    const initialWidth = panel.getBoundingClientRect().width;
    if (desktop) expect(initialWidth).toBeGreaterThan(0);
    state.settings.showComparisonProgress = true;
    action('[title="Open Comparison"]').click();
    render();
    const placement = (title: string) => action(`.header-start-center [title="${title}"]`);
    const restart = placement('Restart Image Comparisons');
    const skip = placement('Skip Image');
    expect(restart.nextElementSibling).toBe(skip);
    const headerElement: HTMLElement = header.nativeElement;
    const centerX = (first: HTMLElement, last = first) =>
      (first.getBoundingClientRect().left + last.getBoundingClientRect().right) / 2;
    headerElement.style.width = '800px';
    let bounds = headerElement.getBoundingClientRect();
    expect(centerX(restart, skip)).toBeCloseTo(bounds.left + bounds.width / 4, 1);
    const filterButton = action('[title="Open Filter Editor"]');
    expect(centerX(filterButton)).toBeCloseTo(bounds.left + bounds.width / 2, 1);
    expect(centerX(action('[title="Hide Comparison Progress"]'), action('[title="Show Comparison Relations"]')))
      .toBeCloseTo(bounds.left + 3 * bounds.width / 4, 1);
    headerElement.style.width = '320px';
    const visible = Array.from(headerElement.querySelectorAll<HTMLElement>('.header-region > .icon-button'),
      button => button.getBoundingClientRect()).filter(rect => rect.width > 0);
    visible.forEach((rect, index) => {
      expect(rect.top).toBeCloseTo(visible[0].top, 1);
      if (index) expect(rect.left).toBeGreaterThanOrEqual(visible[index - 1].right - 0.1);
    });
    headerElement.scrollLeft = headerElement.scrollWidth;
    expect(action('[title="Open Settings"]').getBoundingClientRect().right)
      .toBeLessThanOrEqual(headerElement.getBoundingClientRect().right + 1);
    restart.click();
    skip.click();
    render();
    expect(state.imageSort.activeInsertion.imageId).toBe('image:favorite');
    skip.click();
    render();
    expect(state.imageSort.activeInsertion.imageId).toBe('image:other');
    headerElement.style.removeProperty('width');
    action('[title="Consistency Checks Only"]').click();
    render();
    expect(placement('Skip Image')).toBeNull();
    expect(action('.fa-bars-progress')).toBeNull();
    expect(gallery.nativeElement.querySelector('.progress-remaining')).toBeNull();
    action('[title="Resume Ranking"]').click();
    render();
    expect(action('[title="Hide Comparison Progress"]')).toBeTruthy();
    expect(gallery.nativeElement.querySelector('.progress-remaining')).toBeTruthy();
    if (desktop) {
      expect(panel.getBoundingClientRect().width).toBe(0);
      expect(panel.getAnimations().length).toBe(0);
    }
    const open = () => {
      action('[title="Open Filter Editor"]').click();
      render();
      expect(action('[title="Close Filter Editor"]').classList.contains('active')).toBeTrue();
      expect(panel.inert).toBeFalse();
      expect(gallery.nativeElement.querySelector('app-filter')).toBe(panel);
      expect(panel.querySelector('[title="Create Tag"], [title="Create Tag Group"], [aria-label="Apply"]')).toBeNull();
      if (!desktop) {
        expect(panel.querySelector('.filter-container').getBoundingClientRect().width)
          .toBeCloseTo(gallery.nativeElement.getBoundingClientRect().width, 0);
      }
    };
    const toggleFavorites = () => {
      panel.querySelector<HTMLButtonElement>('[title="Favorites"]').click();
      render();
      expect(panel.inert).toBeFalse();
      expect(action('[title="Close Filter Editor"]')).toBeTruthy();
      expect(state.filterVisible).toBe(desktop);
    };
    open();
    expect(state.imageSort.activeInsertion.imageId).toBe('image:other');
    expect(action('[title="Close Filter Editor"]').getAttribute('data-count')).toBe('3');
    toggleFavorites();
    expect(action('[title="Close Filter Editor"]').getAttribute('data-count')).toBe('1');
    expect(state.imageSort.currentComparisonIds).toEqual(['image:favorite', 'image:ranked']);
    expect(state.imageSort.pendingImageIds).toContain('image:other');
    expect(filters.masonry.images()).toEqual([favorite, other, ranked]);
    const close = () => { action('[title="Close Filter Editor"]').click(); render(); };
    close();
    action('[title="Open Ranking"]').click();
    render();
    expect(placement('Restart Image Comparisons')).toBeNull();
    open();
    toggleFavorites();
    expect(results.showOnlyFilteredImages).toBeTrue();
    expect(filters.comparison.images()).toEqual([other, ranked]);
    expect(action('[title="Close Filter Editor"]').getAttribute('data-count')).toBe('2');
    close();
    open();
    expect(panel.querySelector('[title="Favorites"] .negative')).toBeTruthy();
    toggleFavorites();
    expect(results.showOnlyFilteredImages).toBeFalse();
    close();
    expect(action('[title="Back to Comparison"]')).toBeTruthy();
    action('[title="Back to Comparison"]').click();
    render();
    action('[title="Back to Gallery"]').click();
    render();
    expect(panel.inert).toBe(!desktop);
    if (desktop) {
      expect(panel.getBoundingClientRect().width).toBe(initialWidth);
      state.fullscreenImage.set(new GalleryImage());
      render();
      expect(panel.inert).toBeTrue();
      state.fullscreenImage.set(null);
      render();
      expect(panel.inert).toBeFalse();
    }
  });

  it('preserves a scrolled Masonry grid across Comparison and its filter panel', async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryComponent, HeaderComponent],
      providers: [
        { provide: GallerySerializationService, useValue: { processData: async () => {}, save: () => {} } },
        { provide: GalleryGoogleDriveService, useValue: {} },
        { provide: GalleryService, useValue: {} }
      ]
    }).compileComponents();
    const state = TestBed.inject(GalleryStateService);
    state.filterVisible = ScreenUtils.isLargeScreen();
    const filters = TestBed.inject(FilterService);
    state.images.push(...Array.from({ length: 60 }, (_, index) => Object.assign(new GalleryImage(), {
      id: String(index), aspectRatio: 1 + (index % 3) / 2, mimeType: 'image/gif',
      thumbnailLink: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
    })));
    const gallery = TestBed.createComponent(GalleryComponent);
    const header = TestBed.createComponent(HeaderComponent);
    const host: HTMLElement = gallery.nativeElement;
    document.body.append(host);
    host.style.cssText = 'width:100vw;height:480px';
    const render = () => { gallery.detectChanges(); header.detectChanges(); };
    render();
    await gallery.whenStable();
    filters.updateFilters();
    render();

    const scroller = host.querySelector<HTMLElement>('.masonry-scroll-container');
    scroller.scrollTop = 200;
    expect(scroller.scrollTop).toBe(200);
    const width = scroller.clientWidth;
    const brick = host.querySelectorAll<HTMLElement>('.masonry-brick')[8];
    const rect = brick.getBoundingClientRect();
    const expectGridInPlace = () => {
      expect(scroller.clientWidth).toBe(width);
      expect(scroller.scrollTop).toBe(200);
      expect(brick.getBoundingClientRect().left).toBe(rect.left);
      expect(brick.getBoundingClientRect().top).toBe(rect.top);
    };
    const action = (selector: string): HTMLElement => header.nativeElement.querySelector(selector);
    action('[title="Open Comparison"]').click();
    render();
    expectGridInPlace();
    const comparison = host.querySelector<HTMLElement>('app-image-tournament');
    expect(comparison.clientWidth).toBe(host.clientWidth);
    const headerTitles = () => Array.from((header.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[title]'), el => el.title);
    const comparisonTitles = headerTitles().filter(title => title !== 'Open Filter Editor');
    action('[title="Open Filter Editor"]').click();
    render();
    expectGridInPlace();
    const sidebar = host.querySelector<HTMLElement>('app-filter');
    expect(comparison.clientWidth).toBe(ScreenUtils.isLargeScreen() ? host.clientWidth - sidebar.clientWidth : host.clientWidth);
    const control = sidebar.querySelector('[title="Favorites"]').getBoundingClientRect();
    expect(sidebar.contains(document.elementFromPoint(control.x + control.width / 2, control.y + control.height / 2))).toBeTrue();
    if (ScreenUtils.isLargeScreen()) {
      expect(headerTitles()).toEqual(jasmine.arrayContaining(comparisonTitles));
      action('[title="Open Ranking"]').click();
      render();
      expect(sidebar.inert).toBeFalse();
      action('[title="Back to Comparison"]').click();
      render();
    } else {
      expect(action('[title="Open Ranking"]')).toBeNull();
      action('[title="Close Filter Editor"]').click();
      render();
    }
    action('[title="Back to Gallery"]').click();
    render();
    expectGridInPlace();
    expect(action('[title="Close Filter"]')).toBeNull();
  });
});
