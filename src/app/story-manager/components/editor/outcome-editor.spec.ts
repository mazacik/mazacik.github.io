import { TestBed } from '@angular/core/testing';
import { OutcomeEditorComponent } from './outcome-editor.component';
import { storyFixture } from '../../engine/story-fixture';
describe('Outcome action selector', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OutcomeEditorComponent] }).compileComponents();
  });
  it('offers only variable actions and preserves step identity when switching actions', async () => {
    const fixture = TestBed.createComponent(OutcomeEditorComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    c.steps = [];
    c.add('effect');
    const id = c.steps[0].id;
    fixture.detectChanges();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['set', 'add', 'reveal', 'addFlag', 'removeFlag']);
    select.value = 'removeFlag';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.steps).toEqual([{ id, kind: 'effect', effect: { kind: 'removeFlag', target: '', value: '' } }]);
    expect(fixture.nativeElement.textContent).not.toMatch(/character|equipment|quantity|unlock/i);
  });
  it('offers only numeric targets for increment actions', async () => {
    const fixture = TestBed.createComponent(OutcomeEditorComponent),
      c = fixture.componentInstance;
    c.story = storyFixture();
    c.steps = [{ id: 'increment', kind: 'effect', effect: { kind: 'add', target: '', value: 0 } }];
    fixture.detectChanges();
    await fixture.whenStable();
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    expect(Array.from(selects[1].options).map((o) => o.textContent.trim())).toEqual(['Choose variable', 'Trust']);
  });
});
