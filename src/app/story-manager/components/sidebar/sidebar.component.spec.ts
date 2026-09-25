import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { ArticleOptionsComponent } from '../dialogs/story-options/story-options.component';
import { StoryManagerStateService } from '../../services/story-manager-state.service';
import { parseDocument } from '../../services/story-document';

describe('Compact note navigation', () => {
  let fixture: ComponentFixture<SidebarComponent>, notes: StoryManagerStateService, save: jasmine.Spy;

  beforeEach(async () => {
    save = jasmine.createSpy('save');
    notes = new StoryManagerStateService({} as any, { save } as any);
    notes.articles = parseDocument({
      articles: [
        { id: 'story', title: 'Story', folder: true, text: '', childIds: ['note', 'folder'] },
        { id: 'note', title: 'Top level note', folder: false, text: 'Keep this text', childIds: [] },
        { id: 'folder', title: 'Folder', folder: true, text: '', childIds: ['nested'] },
        { id: 'nested', title: 'Nested folder', folder: true, text: '', childIds: ['deep'] },
        { id: 'deep', title: 'Deep note', folder: false, text: 'Keep this too', childIds: [] },
      ],
    }).articles;
    notes.storyFolder = notes.articles[0];
    await TestBed.configureTestingModule({
      imports: [SidebarComponent, ArticleOptionsComponent],
      providers: [{ provide: StoryManagerStateService, useValue: notes }],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
    fixture.nativeElement.style.cssText = 'width:260px;height:400px;font-size:14px';
    fixture.detectChanges();
  });

  const row = (fixture: ComponentFixture<SidebarComponent>, name: string): HTMLElement => fixture.nativeElement.querySelector(`[aria-label="${name}"]`);

  it('gives note titles the leading space without invisible icons or ancestor spacers', () => {
    const note = row(fixture, 'Top level note');
    expect(fixture.nativeElement.querySelector('.tree-indent, .placeholder, .root-drop-zone')).toBeNull();
    expect(note.querySelectorAll('i').length).toBe(0);
    expect(note.querySelector('.title').getBoundingClientRect().left - note.getBoundingClientRect().left).toBeLessThan(10);
    expect(note.hasAttribute('aria-expanded')).toBeFalse();
    expect(save).not.toHaveBeenCalled();
  });

  it('lists notes from closed legacy folders without showing folders or changing stored hierarchy', () => {
    expect(row(fixture, 'Folder')).toBeNull();
    expect(row(fixture, 'Nested folder')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-sidebar-row').length).toBe(2);
    const deep = row(fixture, 'Deep note');
    deep.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(notes.current.id).toBe('deep');
    expect(deep.getBoundingClientRect().left).toBe(row(fixture, 'Top level note').getBoundingClientRect().left);
    expect(deep.classList.contains('current')).toBeTrue();
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input');
    search.value = 'Keep this too';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(deep.classList.contains('search-result')).toBeTrue();
    expect(notes.current.parent).toBe(notes.articles[3]);
    expect(notes.articles[3].parent).toBe(notes.articles[2]);
    expect(notes.current.text).toBe('Keep this too');
    expect(save).not.toHaveBeenCalled();
  });

  it('only offers note creation and uses the shared story button styling', () => {
    const create = spyOn(notes, 'create').and.resolveTo();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.buttons-container button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent.trim()).toBe('Create Note');
    expect(buttons[0].classList.contains('button')).toBeFalse();
    buttons[0].click();
    expect(create).toHaveBeenCalledOnceWith(notes.storyFolder, false);
    const dialog = TestBed.createComponent(ArticleOptionsComponent);
    dialog.componentInstance.inputs = { article: notes.storyFolder };
    dialog.detectChanges();
    expect(dialog.nativeElement.textContent).not.toContain('Create Folder');
    expect(dialog.nativeElement.textContent).not.toContain('Sub-Folder');
  });

  it('allows legacy nested notes to move to the end of the flat list', () => {
    const dataTransfer = new DataTransfer();
    row(fixture, 'Deep note').dispatchEvent(new DragEvent('dragstart', { dataTransfer, bubbles: true }));
    fixture.detectChanges();
    expect(dataTransfer.getData('text/plain')).toBe('deep');
    const target: HTMLElement = fixture.nativeElement.querySelector('.root-drop-zone');
    expect(target.textContent).toBe('Move to end');
    expect(target.closest('.items-container')).toBeNull();
    const over = new DragEvent('dragover', { dataTransfer, bubbles: true, cancelable: true });
    target.dispatchEvent(over);
    expect(over.defaultPrevented).toBeTrue();
    target.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(notes.articles[4].parent).toBe(notes.storyFolder);
    expect(notes.storyFolder.children.at(-1).id).toBe('deep');
    expect(fixture.nativeElement.querySelector('.root-drop-zone')).toBeNull();
    expect(save).toHaveBeenCalledOnceWith(true);
    save.calls.reset();
    const note = row(fixture, 'Top level note');
    note.dispatchEvent(new DragEvent('dragstart', { dataTransfer, bubbles: true }));
    fixture.detectChanges();
    note.dispatchEvent(new DragEvent('dragend', { dataTransfer, bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.root-drop-zone')).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('exposes note dialog actions as native buttons with the same handlers', () => {
    const dialog = TestBed.createComponent(ArticleOptionsComponent);
    dialog.componentInstance.inputs = { article: notes.articles[1] };
    const close = (dialog.componentInstance.resolve = jasmine.createSpy('close'));
    const rename = spyOn(notes, 'rename');
    dialog.detectChanges();
    expect(dialog.nativeElement.querySelector('[class*="action-button"]')).toBeNull();
    const buttons = dialog.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    buttons[0].click();
    expect(rename).toHaveBeenCalledWith(notes.articles[1]);
    expect(close).toHaveBeenCalled();
  });
});
