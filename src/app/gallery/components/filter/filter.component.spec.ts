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
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.button'))
      .find(element => element.textContent.trim() === label);
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
    input().value = query;
    input().dispatchEvent(new Event('input'));
    await render();
  }

  async function key(key: string, options: KeyboardEventInit = {}): Promise<KeyboardEvent> {
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
    expect([button('List').textContent.trim(), button('Tree').textContent.trim()]).toEqual(['List', 'Tree']);
    expect(button('Tree').getAttribute('aria-pressed')).toBe('true');

    await mode('List');
    expect(state.settings.filterMode).toBe('list');
    expect(input()).not.toBeNull();
    expect(listRows().map(element => element.id)).toEqual([
      'filter-list-result-animals',
      'filter-list-result-cats',
      'filter-list-result-dogs'
    ]);
    expect(document.activeElement).toBe(input());

    await search('dogs');
    await mode('Tree');
    expect(state.settings.filterMode).toBe('tree');
    expect(input()).toBeNull();
    await mode('List');
    expect(input().value).toBe('');
    expect(save).toHaveBeenCalledTimes(3);
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
    const clear = Array.from(fixture.nativeElement.querySelectorAll('.button') as NodeListOf<HTMLElement>)
      .find(button => button.textContent.trim() === 'Clear Tag Filters');
    clear.click();
    await render();
    expect(animals.state).toBe(0);
    expect(cats.state).toBe(0);
    expect(filters.images().length).toBe(2);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reveals the hidden group filter button on keyboard focus with state and action labels', async () => {
    const button = groupButton();
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    expect(button.querySelector('.fa-check-double')).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe(button.title);
    expect(button.title).toContain('Animals: neutral. Click to include');
    expect(getComputedStyle(button).opacity).toBe('0');
    expect(getComputedStyle(button).pointerEvents).toBe('none');
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
