import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { GalleryImage } from '../../models/gallery-image.class';
import { GalleryGroup } from '../../models/gallery-group.class';
import { Tag } from '../../models/tag.class';
import { FilterService } from '../../services/filter.service';
import { GalleryGoogleDriveService } from '../../services/gallery-google-drive.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryService } from '../../services/gallery.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { TagService } from '../../services/tag.service';
import { TaggerComponent } from './tagger.component';

@Component({ selector: 'app-image', template: '', inputs: ['src'] })
class TestImageComponent {}

describe('List and Tree tagger modes', () => {
  let fixture: ComponentFixture<TaggerComponent>;
  let image: GalleryImage;
  let sibling: GalleryImage;
  let small: Tag;
  let large: Tag;
  let alias: Tag;
  let tags: TagService;
  let state: GalleryStateService;
  let save: jasmine.Spy;
  let updateFilters: jasmine.Spy;
  let fullscreenImage: ReturnType<typeof signal<GalleryImage>>;

  beforeEach(async () => {
    image = Object.assign(new GalleryImage(), { id: 'one', name: 'One.jpg', tags: [], note: '' });
    sibling = Object.assign(new GalleryImage(), { id: 'two', name: 'Two.jpg', tags: [], note: '' });
    const group = Object.assign(new GalleryGroup(), { id: 'group', images: [image, sibling] });
    image.group = group;
    sibling.group = group;
    fullscreenImage = signal(image);
    state = { fullscreenImage, images: [image, sibling], settings: {} } as GalleryStateService;
    save = jasmine.createSpy('save');
    updateFilters = jasmine.createSpy('updateFilters');
    tags = new TagService(null, null, state as unknown as GalleryStateService, null);
    const animals = Object.assign(new Tag(), { id: 'animals', name: 'Animals', group: true, children: [], open: true });
    large = Object.assign(new Tag(), { id: 'large', name: 'Dog large', group: false, parent: animals, children: [] });
    small = Object.assign(new Tag(), { id: 'small', name: 'Dog small', group: false, parent: animals, children: [] });
    alias = Object.assign(new Tag(), { id: 'alias', name: 'Dog alias', group: false, parent: animals, children: [small] });
    animals.children = [alias, large, small];
    tags.tags.push(animals, alias, large, small);

    await TestBed.configureTestingModule({
      imports: [TaggerComponent],
      providers: [
        { provide: TagService, useValue: tags },
        { provide: GalleryStateService, useValue: state },
        { provide: GalleryService, useValue: {} },
        { provide: GalleryGoogleDriveService, useValue: {} },
        { provide: GallerySerializationService, useValue: { save } },
        { provide: FilterService, useValue: { updateFilters } }
      ]
    }).overrideComponent(TaggerComponent, {
      remove: { imports: [ImageComponent] },
      add: { imports: [TestImageComponent] }
    }).compileComponents();
    fixture = TestBed.createComponent(TaggerComponent);
    await render();
    await mode('List');
    save.calls.reset();
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.button'))
      .find(element => element.textContent.trim() === label);
  }

  async function mode(label: 'List' | 'Tree'): Promise<void> {
    button(label).click();
    await render();
  }

  function rows(section: 'applied' | 'unapplied'): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(
      (section === 'applied' ? '.applied-tags-container' : '#tagger-search-results') + ' app-tagger-row'));
  }

  async function clickApplied(tag: Tag): Promise<void> {
    rows('applied').find(row => row.textContent.includes(tag.name)).querySelector<HTMLElement>('.cursor-pointer').click();
    await render();
  }

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.search-input');
  }

  async function search(query = 'dog'): Promise<void> {
    input().focus();
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

  function enableGroupMode(): void {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.button'))
      .find(element => element.textContent.trim() === 'Group Mode');
    button.click();
    fixture.detectChanges();
  }

  it('highlights the first applicable result and navigates without leaving the search input', async () => {
    await search();
    expect(focusedId()).toBe('tagger-search-result-large');
    expect(fixture.nativeElement.querySelector('.search-focused').id).toBe(focusedId());
    expect(document.activeElement).toBe(input());
    expect((await key('ArrowUp')).defaultPrevented).toBeTrue();
    expect(focusedId()).toBe('tagger-search-result-large');
    await key('ArrowDown');
    expect(focusedId()).toBe('tagger-search-result-small');
    expect(fixture.nativeElement.querySelectorAll('.search-focused').length).toBe(1);
    await key('ArrowDown');
    expect(focusedId()).toBe('tagger-search-result-small');
    await key('ArrowUp');
    expect(focusedId()).toBe('tagger-search-result-large');
    expect(document.activeElement).toBe(input());
  });

  it('navigates from unapplied tags into applied tags and toggles them with Enter', async () => {
    image.tags = [large];
    await render();
    expect(focusedId()).toBe('tagger-search-result-small');

    await key('ArrowUp');
    expect(focusedId()).toBe('tagger-applied-tag-large');
    expect(fixture.nativeElement.querySelector('.search-focused').id).toBe(focusedId());
    await key('ArrowDown');
    expect(focusedId()).toBe('tagger-search-result-small');
    await key('ArrowUp');
    await key('Enter');

    expect(image.tags).toEqual([]);
    expect(focusedId()).toBe('tagger-search-result-large');
    expect(document.activeElement).toBe(input());
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('Enter applies the selected tag only to the current image and clears the search', async () => {
    await search();
    await key('ArrowDown');
    const event = await key('Enter');
    expect(event.defaultPrevented).toBeTrue();
    expect(image.tags).toEqual([small]);
    expect(sibling.tags).toEqual([]);
    expect(save).toHaveBeenCalledTimes(1);
    expect(updateFilters).toHaveBeenCalledTimes(1);
    expect(input().value).toBe('');
    expect(focusedId()).toBe('tagger-search-result-large');
    expect(document.activeElement).toBe(input());
  });

  it('uses group membership and retains partial/full indicators and click behavior', async () => {
    enableGroupMode();
    expect(rows('applied').length).toBe(0);
    image.tags = [large];
    await search('small');
    expect(rows('applied').length).toBe(1);
    expect(rows('applied')[0].querySelector('.underline-positive')).not.toBeNull();
    await clickApplied(large);
    expect(image.tags).toEqual([large]);
    expect(sibling.tags).toEqual([large]);
    expect(rows('applied')[0].querySelector('.positive')).not.toBeNull();
    expect(input().value).toBe('small');
    await clickApplied(large);
    expect(image.tags).toEqual([]);
    expect(sibling.tags).toEqual([]);
    expect(rows('applied').length).toBe(0);
    expect(input().value).toBe('small');
    await search('dog');
    await key('Enter', { shiftKey: true });
    expect(image.tags).toEqual([large]);
    expect(sibling.tags).toEqual([large]);
    expect(focusedId()).toBe('tagger-search-result-small');
    expect(save).toHaveBeenCalledTimes(3);
    expect(updateFilters).toHaveBeenCalledTimes(3);
  });

  it('keeps the query and selects an unapplied result with Shift+Enter and ignores repeated Enter', async () => {
    await search();
    await key('ArrowDown');
    await key('Enter', { shiftKey: true });
    expect(input().value).toBe('dog');
    expect(focusedId()).toBe('tagger-search-result-large');
    await key('Enter', { repeat: true, shiftKey: true });
    expect(image.tags).toEqual([small]);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('resets selection as the query changes and does nothing for empty or disabled results', async () => {
    await search();
    await key('ArrowDown');
    await search('dog large');
    expect(focusedId()).toBe('tagger-search-result-large');
    for (const query of ['unmatched', 'dog alias']) {
      await search(query);
      expect(focusedId()).toBeNull();
      await key('ArrowDown');
      await key('Enter');
    }
    expect(image.tags).toEqual([]);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not apply tags during IME composition or with no current image', async () => {
    await search();
    const event = await key('Enter', { isComposing: true });
    expect(event.defaultPrevented).toBeFalse();
    fullscreenImage.set(null);
    await render();
    await key('Enter');
    expect(save).not.toHaveBeenCalled();
  });

  it('scrolls the selected result within the results panel', async () => {
    await search();
    const panel = fixture.nativeElement.querySelector('.filters-container') as HTMLElement;
    const row = fixture.nativeElement.querySelector('#tagger-search-result-small') as HTMLElement;
    Object.defineProperty(panel, 'scrollTop', { value: 0, writable: true, configurable: true });
    spyOn(panel, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 300, 100));
    spyOn(row, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 150, 300, 24));
    await key('ArrowDown');
    expect(panel.scrollTop).toBe(74);
  });

  it('retains mouse activation and clears focus when using the clear button', async () => {
    await search();
    const result = fixture.nativeElement.querySelector('#tagger-search-result-large .cursor-pointer') as HTMLElement;
    result.click();
    await render();
    expect(image.tags).toEqual([large]);
    expect(input().value).toBe('');
    await search();
    await key('ArrowDown');
    (fixture.nativeElement.querySelector('.clear-search-button') as HTMLButtonElement).click();
    await render();
    expect(input().value).toBe('');
    expect(focusedId()).toBe('tagger-search-result-small');
    expect(document.activeElement).toBe(input());
  });

  it('defaults to Tree with no search and preserves tree expansion when switching modes', async () => {
    delete state.settings.taggerMode;
    await render();
    expect(input()).toBeNull();
    const modeButtons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.buttons-container > .button-row .button')).slice(0, 2);
    expect(modeButtons.map(element => element.textContent.trim())).toEqual(['List', 'Tree']);
    expect(button('Tree').getAttribute('aria-pressed')).toBe('true');
    const folder = tags.getRootTags()[0];
    const treeRow = fixture.nativeElement.querySelector('app-tagger-row .cursor-pointer') as HTMLElement;
    treeRow.click();
    await render();
    expect(folder.open).toBeFalse();
    await mode('List');
    expect(document.activeElement).toBe(input());
    expect(rows('unapplied').length).toBe(2);
    expect(rows('unapplied')[0].textContent).toContain('Dog large | Animals');
    await search('small');
    await mode('Tree');
    expect(input()).toBeNull();
    expect(folder.open).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Dog alias');
    await mode('List');
    expect(input().value).toBe('');
    expect(focusedId()).toBe('tagger-search-result-large');
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('saves the preference and reads it from restored settings', async () => {
    await mode('Tree');
    expect(state.settings.taggerMode).toBe('tree');
    await mode('List');
    expect(state.settings.taggerMode).toBe('list');
    expect(save).toHaveBeenCalledTimes(2);
    const restored = JSON.parse(JSON.stringify(state.settings));
    fixture.destroy();
    state.settings = restored;
    fixture = TestBed.createComponent(TaggerComponent);
    await render();
    expect(input()).not.toBeNull();
    expect(button('List').getAttribute('aria-pressed')).toBe('true');
  });

  it('tracks the current image, keeps applied tags visible, and resets selection on target and group changes', async () => {
    sibling.tags = [small];
    await search();
    await key('ArrowDown');
    fullscreenImage.set(sibling);
    await render();
    expect(rows('applied').length).toBe(1);
    expect(rows('applied')[0].textContent).toContain('Dog small');
    expect(focusedId()).toBe('tagger-search-result-large');
    await search('unmatched');
    expect(rows('applied').length).toBe(1);
    expect(rows('unapplied').length).toBe(0);
    await clickApplied(small);
    expect(rows('applied').length).toBe(0);
    expect(input().value).toBe('unmatched');
    await search();
    await key('ArrowDown');
    enableGroupMode();
    expect(focusedId()).toBe('tagger-search-result-large');
    await key('ArrowDown');
    enableGroupMode();
    expect(focusedId()).toBe('tagger-search-result-large');
  });

  it('finds tags through direct and indirect parent group names', async () => {
    const animals = tags.getRootTags()[0];
    const mammals = Object.assign(new Tag(), { id: 'mammals', name: 'Mammals', group: true, parent: animals, children: [] });
    const tiger = Object.assign(new Tag(), { id: 'tiger', name: 'Tiger', group: false, parent: mammals, children: [] });
    mammals.children = [tiger];
    animals.children.push(mammals);
    tags.tags.push(mammals, tiger);

    await search('animal tiger');
    expect(rows('unapplied').map(row => row.id)).toEqual(['tagger-search-result-tiger']);
    await search('mammal');
    expect(rows('unapplied').map(row => row.id)).toEqual(['tagger-search-result-tiger']);
  });
  it('ranks own-name prefixes first without changing shared search ordering', async () => {
    const folder = tags.getRootTags()[0];
    const add = (id: string, name: string, parent?: Tag) => {
      const tag = Object.assign(new Tag(), { id, name, parent, children: [], group: false });
      tags.tags.push(tag);
      return tag;
    };
    const other = add('other', 'hellorender123', folder);
    const prefix = add('prefix', 'renders');
    const secondPrefix = add('second-prefix', 'renders Z');
    await search('  ReNdEr  ');
    expect(rows('unapplied').map(row => row.id)).toEqual([prefix, secondPrefix, other].map(tag => 'tagger-search-result-' + tag.id));
    expect(tags.searchTags('render')).toEqual([other, prefix, secondPrefix]);
    await search('ANIMALS');
    expect(rows('unapplied').length).toBe(3);
    await search('large ANIMALS');
    expect(rows('unapplied').map(row => row.id)).toEqual(['tagger-search-result-large']);
  });

  it('falls back to applied tags when no unapplied tags remain', async () => {
    expect(input().value).toBe('');
    expect(focusedId()).toBe('tagger-search-result-large');
    await key('ArrowDown');
    await key('Enter');
    expect(image.tags).toEqual([small]);
    expect(rows('applied').length).toBe(1);
    expect(focusedId()).toBe('tagger-search-result-large');
    expect(fixture.nativeElement.querySelector('#tagger-search-result-small')).toBeNull();
    await key('Enter');
    expect(rows('unapplied').length).toBe(0);
    expect(focusedId()).toBe('tagger-applied-tag-large');
    await key('Enter');
    expect(image.tags).toEqual([small]);
    expect(focusedId()).toBe('tagger-search-result-large');
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('preserves the query with Shift-click and applied clicks, and uses bold-only keyboard highlighting', async () => {
    await search();
    const highlighted = fixture.nativeElement.querySelector('.search-focused') as HTMLElement;
    expect(getComputedStyle(highlighted).fontWeight).toBe('700');
    expect(getComputedStyle(highlighted).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(highlighted).outlineStyle).toBe('none');
    highlighted.querySelector('.cursor-pointer').dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await render();
    expect(image.tags).toEqual([large]);
    expect(input().value).toBe('dog');
    expect(focusedId()).toBe('tagger-search-result-small');
    await clickApplied(large);
    expect(input().value).toBe('dog');
    expect(rows('unapplied').length).toBe(2);
    expect(document.activeElement).toBe(input());
  });

  it('caps long applied lists and scrolls both sections independently within the available viewport', async () => {
    const host = fixture.nativeElement as HTMLElement;
    host.style.transition = 'none';
    host.style.height = Math.max(600, Math.min(window.innerHeight, 900)) + 'px';
    for (let index = 0; index < 100; index++) {
      const tag = Object.assign(new Tag(), { id: 'extra-' + index, name: 'Tag ' + index, children: [], group: false });
      tags.tags.push(tag);
      if (index < 50) image.tags.push(tag);
    }
    await render();
    const area = host.querySelector<HTMLElement>('.tag-list-area');
    const applied = host.querySelector<HTMLElement>('.applied-tags-container');
    const lower = host.querySelector<HTMLElement>('.filters-container');
    expect(area.clientHeight).toBeGreaterThan(100);
    expect(applied.getBoundingClientRect().height).toBeLessThanOrEqual(area.clientHeight * 0.4 + 1);
    expect(applied.scrollHeight).toBeGreaterThan(applied.clientHeight);
    expect(lower.scrollHeight).toBeGreaterThan(lower.clientHeight);
    applied.scrollTop = 50;
    expect(applied.scrollTop).toBe(50);
    expect(lower.scrollTop).toBe(0);
    lower.scrollTop = 50;
    expect(applied.scrollTop).toBe(50);
    expect(input().getBoundingClientRect().top).toBeGreaterThanOrEqual(applied.getBoundingClientRect().bottom);
    expect(input().getBoundingClientRect().bottom).toBeLessThanOrEqual(lower.getBoundingClientRect().top);
    expect(button('List').getBoundingClientRect().bottom).toBeLessThanOrEqual(host.getBoundingClientRect().bottom);
  });

});
