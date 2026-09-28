import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GalleryImage } from '../../models/gallery-image.class';
import { Tag } from '../../models/tag.class';
import { FilterService } from '../../services/filter.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryService } from '../../services/gallery.service';
import { TagService } from '../../services/tag.service';
import { FilterRowComponent } from './filter-row/filter-row.component';
import { FilterComponent } from './filter.component';

describe('Gallery group filter controls', () => {
  let fixture: ComponentFixture<FilterComponent>;
  let tags: TagService;
  let filters: FilterService;
  let state: GalleryStateService;
  let animals: Tag;
  let cats: Tag;
  let dogs: Tag;
  let save: jasmine.Spy;

  beforeEach(async () => {
    animals = Object.assign(new Tag(), { id: 'animals', name: 'Animals', group: true, open: true, children: [] });
    cats = Object.assign(new Tag(), { id: 'cats', name: 'Cats', parent: animals, children: [] });
    dogs = Object.assign(new Tag(), { id: 'dogs', name: 'Dogs', parent: animals, children: [] });
    animals.children = [cats, dogs];
    state = {
      filterVisible: true, settings: {},
      images: [cats, dogs].map(tag => Object.assign(new GalleryImage(), { id: tag.id, tags: [tag], mimeType: 'image/jpeg' }))
    } as GalleryStateService;
    tags = new TagService(null, null, state, null);
    tags.tags.push(animals, cats, dogs);
    filters = new FilterService(state, tags);
    filters.updateFilters();
    save = jasmine.createSpy('save');
    await TestBed.configureTestingModule({
      imports: [FilterComponent],
      providers: [
        { provide: TagService, useValue: tags },
        { provide: FilterService, useValue: filters },
        { provide: GalleryStateService, useValue: state },
        { provide: GalleryService, useValue: {} },
        { provide: GallerySerializationService, useValue: { save } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(FilterComponent);
    await render();
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function row(tag: Tag): HTMLElement {
    return fixture.debugElement.queryAll(By.directive(FilterRowComponent))
      .find(element => element.componentInstance.tag === tag).nativeElement;
  }

  function groupButton(): HTMLButtonElement {
    return row(animals).querySelector('.group-filter-button');
  }

  function button(label: string): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`.filter-actions [aria-label="${label}"]`);
  }

  async function mode(label: 'List' | 'Tree'): Promise<void> {
    button(label).click();
    await render();
  }

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.search-input');
  }

  function listRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('#filter-list-results app-filter-row'));
  }

  async function search(query: string): Promise<void> {
    input().focus();
    input().value = query;
    input().dispatchEvent(new Event('input'));
    await render();
  }

  async function key(key: string, options: KeyboardEventInit = {}): Promise<KeyboardEvent> {
    input().focus();
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
    input().dispatchEvent(event);
    await render();
    return event;
  }

  function focusedId(): string | null {
    return input().getAttribute('aria-activedescendant');
  }

  it('cycles the group state without changing expansion or child filters and saves each change', async () => {
    cats.state = -1;
    await render();
    groupButton().click();
    await render();
    expect(animals.state).toBe(1);
    expect(animals.open).toBeTrue();
    expect(cats.state).toBe(-1);
    expect(filters.images().map(image => image.id)).toEqual(['dogs']);
    expect(groupButton().classList).toContain('positive');
    expect(row(animals).querySelector('.flex-1.overflow-hidden').classList).toContain('positive');
    expect(groupButton().getAttribute('aria-label')).toContain('Animals: included. Click to exclude');
    groupButton().click();
    await render();
    expect(animals.state).toBe(-1);
    expect(groupButton().classList).toContain('negative');
    expect(filters.images()).toEqual([]);
    groupButton().click();
    await render();
    expect(animals.state).toBe(0);
    expect(animals.open).toBeTrue();
    expect(cats.state).toBe(-1);
    expect(filters.images().map(image => image.id)).toEqual(['dogs']);
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('places the image count left and icon-only quick filters right in one row', async () => {
    const count = fixture.nativeElement.querySelector('.filter-count') as HTMLElement;
    const summary = count.parentElement;
    const toggles = Array.from(summary.querySelectorAll<HTMLButtonElement>('.filter-toggle'));
    const summaryStyle = getComputedStyle(summary);
    expect(summaryStyle.justifyContent).toBe('space-between');
    expect(parseFloat(summaryStyle.paddingLeft)).toBeCloseTo(parseFloat(summaryStyle.paddingTop) * 4, 2);
    expect(summaryStyle.marginLeft).toBe('0px');
    expect(count.textContent.trim()).toBe('Filter • 2');
    expect(toggles.map(toggle => toggle.getAttribute('aria-label'))).toEqual(['Favorites', 'Bookmarks', 'Groups']);
    expect(toggles.every(toggle => toggle.textContent.trim() === '')).toBeTrue();

    toggles[0].click();
    await render();
    expect(filters.favoritesFilter.state).toBe(1);
    expect(toggles[0].querySelector('.fa-heart').classList).toContain('positive');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('lets a green child override a red group through the filter controls', async () => {
    groupButton().click();
    groupButton().click();
    await render();
    expect(animals.state).toBe(-1);
    expect(filters.images()).toEqual([]);
    row(dogs).querySelector<HTMLElement>('.align-items-center').click();
    await render();
    expect(dogs.state).toBe(1);
    expect(animals.state).toBe(-1);
    expect(filters.images().map(image => image.id)).toEqual(['dogs']);
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('keeps name and arrow clicks dedicated to expansion', async () => {
    row(animals).querySelector<HTMLElement>('.align-items-center').click();
    await render();
    expect(animals.open).toBeFalse();
    expect(animals.state).toBe(0);
    row(animals).querySelector<HTMLElement>('.fa-angle-right').click();
    await render();
    expect(animals.open).toBeTrue();
    expect(save).not.toHaveBeenCalled();
    expect(row(cats).querySelector('.group-filter-button')).toBeNull();
  });

  it('finds groups and descendants with full-path matching in List mode', async () => {
    await mode('List');
    save.calls.reset();
    await search('ANIMALS');
    const rendered = fixture.debugElement.queryAll(By.directive(FilterRowComponent)).map(element => element.componentInstance.tag);
    expect(rendered).toEqual([animals, cats, dogs]);
    expect(tags.searchTags('animals')).toEqual([cats, dogs]);
    groupButton().click();
    await render();
    expect(animals.state).toBe(1);
    expect(animals.open).toBeTrue();
    expect(save).toHaveBeenCalledTimes(1);
    await search('cats ANIMALS');
    expect(fixture.debugElement.queryAll(By.directive(FilterRowComponent)).map(element => element.componentInstance.tag)).toEqual([cats]);
  });

  it('defaults to Tree without search and saves an independent List preference', async () => {
    expect(input()).toBeNull();
    expect([button('List').title, button('Tree').title]).toEqual(['List', 'Tree']);
    expect(button('Tree').getAttribute('aria-pressed')).toBe('true');

    await mode('List');
    expect(state.settings.filterMode).toBe('list');
    expect(input()).not.toBeNull();
    expect(listRows().map(element => element.id)).toEqual([
      'filter-list-result-animals',
      'filter-list-result-cats',
      'filter-list-result-dogs'
    ]);
    expect(listRows().map(element => element.querySelector('.ellipsis').textContent.trim())).toEqual([
      'Animals',
      'Cats | Animals',
      'Dogs | Animals'
    ]);
    expect(document.activeElement).not.toBe(input());

    await search('dogs');
    await mode('Tree');
    expect(state.settings.filterMode).toBe('tree');
    expect(input()).toBeNull();
    await mode('List');
    expect(input().value).toBe('');
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('does not focus the search input when List mode is restored', async () => {
    state.settings.filterMode = 'list';
    fixture.destroy();
    fixture = TestBed.createComponent(FilterComponent);
    await render();

    expect(input()).not.toBeNull();
    expect(document.activeElement).not.toBe(input());
  });

  it('matches normal tags, pseudo tags, and groups through indirect parent names', async () => {
    const mammals = Object.assign(new Tag(), { id: 'mammals', name: 'Mammals', group: true, parent: animals, open: true, children: [] });
    const tigers = Object.assign(new Tag(), { id: 'tigers', name: 'Tigers', parent: mammals, children: [] });
    const aliases = Object.assign(new Tag(), { id: 'aliases', name: 'Felines', parent: mammals, children: [cats] });
    mammals.children = [aliases, tigers];
    animals.children.push(mammals);
    tags.tags.push(mammals, aliases, tigers);

    await mode('List');
    await search('animal');
    expect(listRows().map(element => element.id)).toEqual([
      animals, cats, dogs, aliases, mammals, tigers
    ].sort((left, right) => left.getNameWithParents().localeCompare(right.getNameWithParents()))
      .map(tag => 'filter-list-result-' + tag.id));
    await search('animal tiger');
    expect(listRows().map(element => element.id)).toEqual(['filter-list-result-tigers']);
  });

  it('navigates the unified list and cycles the selected filter without clearing search', async () => {
    await mode('List');
    save.calls.reset();
    await search('animals');
    expect(focusedId()).toBe('filter-list-result-animals');
    expect(document.activeElement).toBe(input());
    expect((await key('ArrowDown')).defaultPrevented).toBeTrue();
    expect(focusedId()).toBe('filter-list-result-cats');

    await key('Enter');
    expect(cats.state).toBe(1);
    expect(input().value).toBe('animals');
    expect(focusedId()).toBe('filter-list-result-cats');
    await key('Enter');
    expect(cats.state).toBe(-1);
    await key('Enter');
    expect(cats.state).toBe(0);
    expect(save).toHaveBeenCalledTimes(3);
    expect(document.activeElement).toBe(input());
  });

  it('resets keyboard selection when searching and ignores repeated or composing Enter', async () => {
    await mode('List');
    save.calls.reset();
    await key('ArrowDown');
    expect(focusedId()).toBe('filter-list-result-cats');
    await search('dogs');
    expect(focusedId()).toBe('filter-list-result-dogs');
    await key('Enter', { repeat: true });
    await key('Enter', { isComposing: true });
    expect(dogs.state).toBe(0);
    expect(save).not.toHaveBeenCalled();
  });
  it('clears group and child filters together', async () => {
    animals.state = 1;
    cats.state = -1;
    filters.updateFilters();
    await render();
    button('Clear Tag Filters').click();
    await render();
    expect(animals.state).toBe(0);
    expect(cats.state).toBe(0);
    expect(filters.images().length).toBe(2);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('shows all six bottom actions as a grouped Font Awesome icon row', () => {
    const actions = Array.from((fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.filter-actions > button, .filter-actions > .flex > button'));
    expect(actions.map(action => action.getAttribute('aria-label'))).toEqual([
      'List', 'Tree', 'Invert Tag Filters', 'Clear Tag Filters', 'Create Tag', 'Create Tag Group'
    ]);
    expect(actions.every(action => action.classList.contains('icon-button') &&
      (action.classList.contains('fa-solid') || action.querySelector('.fa-solid')))).toBeTrue();
    expect(button('List').classList).toContain('fa-bars');
    expect(button('Tree').classList).toContain('fa-folder-tree');
    expect(button('Create Tag').querySelector('.fa-tag')).not.toBeNull();
    expect(button('Create Tag Group').querySelector('.fa-folder')).not.toBeNull();
    expect(button('Create Tag').querySelector('.action-badge.fa-plus')).not.toBeNull();
    expect(button('Create Tag Group').querySelector('.action-badge.fa-plus')).not.toBeNull();
    expect(button('Invert Tag Filters').querySelector('.fa-filter')).not.toBeNull();
    expect(button('Invert Tag Filters').querySelector('.action-badge.fa-exclamation')).not.toBeNull();
    expect(button('Clear Tag Filters').querySelector('.fa-filter')).not.toBeNull();
    expect(button('Clear Tag Filters').querySelector('.action-badge.fa-xmark')).not.toBeNull();
    expect(actions.map(action => getComputedStyle(action).padding)).toEqual(Array(6).fill('0px'));
  });

  it('keeps the group filter button visible on mobile and reveals it on desktop keyboard focus', async () => {
    const button = groupButton();
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    expect(button.querySelector('.fa-check-double')).not.toBeNull();
    expect(button.title).toBe('');
    expect(button.getAttribute('aria-label')).toContain('Animals: neutral. Click to include');
    const mobile = matchMedia('(max-width:1280px)').matches;
    expect(getComputedStyle(button).opacity).toBe(mobile ? '1' : '0');
    expect(getComputedStyle(button).pointerEvents).toBe(mobile ? 'auto' : 'none');
    expect(getComputedStyle(button).justifyContent).toBe('flex-end');
    button.focus();
    expect(document.activeElement).toBe(button);
    const bounds = button.getBoundingClientRect();
    expect(bounds.width).toBeGreaterThanOrEqual(24);
    expect(bounds.height).toBeGreaterThanOrEqual(24);
    expect(getComputedStyle(button).visibility).toBe('visible');
    expect(getComputedStyle(button).opacity).toBe('1');
    expect(bounds.right).toBeLessThanOrEqual(row(animals).getBoundingClientRect().right);
    expect(bounds.left).toBeGreaterThanOrEqual(row(animals).querySelector('.align-items-center').getBoundingClientRect().right);
  });
});
