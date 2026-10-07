import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../shared/services/dialog.service';
import { FlagsEditorComponent } from './flags-editor.component';
import { storyFixture } from '../../engine/story-fixture';
import { copy } from '../../models/story.model';
import { StoryManagerSerializationService } from '../../services/story-manager-serialization.service';

describe('Flag authoring and reader integration', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, FlagsEditorComponent],
      providers: [
        { provide: StoryManagerSerializationService, useValue: { data: { playthroughs: [] }, commit: jasmine.createSpy() } },
        { provide: DialogService, useValue: {} },
      ],
    }).compileComponents();
  });
  it('creates editable stored variables without computed rule controls', async () => {
    const fixture = TestBed.createComponent(FlagsEditorComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.list-footer button').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.selected.initial).toBeFalse();
    expect(c.selected.visible).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Default value');
    expect(fixture.nativeElement.textContent).not.toContain('Computed rule');
    expect(fixture.nativeElement.querySelector('story-flag-rule')).toBeNull();
    expect(c.issues).toEqual([]);
  });
  it('keeps numeric defaults as numbers when entering values and switching variable types', async () => {
    const fixture = TestBed.createComponent(FlagsEditorComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    c.add();
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    await render();
    const type = Array.from(fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>).find((select) => Array.from(select.options).some((option) => option.value === 'number'));
    const selectType = async (value: string) => {
      type.value = value;
      type.dispatchEvent(new Event('change'));
      await render();
    };
    const enter = async (value: string) => {
      const input = fixture.nativeElement.querySelector('story-value input') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await render();
    };
    await selectType('number');
    await enter('1');
    expect(c.selected.initial).toBe(1);
    expect(c.issues).toEqual([]);
    await enter('-1.5');
    expect(c.selected.initial).toBe(-1.5);
    expect(c.issues).toEqual([]);
    await selectType('text');
    await enter('1');
    expect(c.selected.initial).toBe('1');
    await selectType('number');
    await enter('0');
    expect(c.selected.initial).toBe(0);
    expect(c.issues).toEqual([]);
  });
  it('duplicates a stored variable and selects the independent definition', async () => {
    const fixture = TestBed.createComponent(FlagsEditorComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    c.add();
    const original = c.selected;
    original.type = 'number';
    original.initial = 12;
    const before = copy(c.story);
    const changed = spyOn(c.changed, 'emit');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.detail-actions button').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.selected.id).not.toBe(original.id);
    expect(c.selected).toEqual({ ...original, id: c.selected.id, name: `${original.name} (copy)` });
    expect(c.story.flags.slice(0, -1)).toEqual(before.flags);
    c.selected.initial = 20;
    expect(original.initial).toBe(12);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('option[value="character"]')).toBeNull();
  });
});
