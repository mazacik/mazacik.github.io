import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OutcomeEditorComponent } from './outcome-editor.component';
import { flagsFixture } from '../../engine/story-flags-fixture';

describe('Outcome action selector', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OutcomeEditorComponent] }).compileComponents();
  });

  async function setup(allowUnlock = true) {
    const fixture = TestBed.createComponent(OutcomeEditorComponent);
    const c = fixture.componentInstance;
    c.story = flagsFixture();
    c.steps = [];
    c.allowUnlock = allowUnlock;
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await render();
    const buttons = () => Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    const selectAction = async (value: string) => {
      const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await render();
    };
    return { fixture, c, render, buttons, selectAction };
  }

  it('creates an unlock attempt through Action and can switch back without moving the step', async () => {
    const { fixture, c, render, buttons, selectAction } = await setup();
    expect(buttons().map((b) => b.textContent.trim())).toContain('+ Chance');
    expect(buttons().map((b) => b.textContent.trim())).not.toContain('+ Unlock attempt');
    buttons()
      .find((b) => b.textContent.trim() === '+ Action')
      .click();
    await render();
    const id = c.steps[0].id;
    await selectAction('unlockAttempt');
    expect(c.steps).toEqual([{ id, kind: 'unlock', target: '', actor: '', method: '' }]);
    expect(fixture.nativeElement.textContent).toContain('Unlock method');
    expect(fixture.nativeElement.textContent).toContain('Acting character');
    await selectAction('equip');
    expect(c.steps).toEqual([{ id, kind: 'effect', effect: { kind: 'equip', target: '', actor: '', value: '' } }]);
    expect(fixture.nativeElement.textContent).not.toContain('Unlock method');
  });

  it('displays existing unlock attempts without changing their saved configuration', async () => {
    const { fixture, c, render } = await setup();
    c.steps = [{ id: 'saved', kind: 'unlock', target: 'cuffs', actor: 'helper', method: 'key' }];
    const before = JSON.stringify(c.steps);
    await render();
    expect((fixture.nativeElement.querySelector('select') as HTMLSelectElement).value).toBe('unlockAttempt');
    expect(JSON.stringify(c.steps)).toBe(before);
  });

  it('keeps unlock attempts unavailable throughout unlock method branches', async () => {
    const { fixture, c, render } = await setup(false);
    c.add('effect');
    c.add('condition');
    c.add('random');
    await render();
    expect(fixture.nativeElement.querySelector('option[value="unlockAttempt"]')).toBeNull();
    c.changeAction(0, 'unlockAttempt');
    expect(c.steps[0].kind).toBe('effect');
    const branches = fixture.debugElement.queryAll(By.directive(OutcomeEditorComponent));
    expect(branches.length).toBe(4);
    for (const branch of branches) (branch.componentInstance as OutcomeEditorComponent).add('effect');
    await render();
    expect(fixture.nativeElement.querySelector('option[value="unlockAttempt"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('+ Unlock attempt');
    expect(fixture.nativeElement.textContent).toContain('Chance');
  });
});
