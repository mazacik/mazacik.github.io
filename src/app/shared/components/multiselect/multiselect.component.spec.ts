import { Component, DoCheck } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MultiselectComponent, MultiselectOption } from './multiselect.component';

@Component({
  imports: [MultiselectComponent],
  template: '<app-multiselect label="Effects" [options]="options" [value]="value" (valueChange)="update($event)" />',
})
class EffectsHost implements DoCheck {
  checks = 0;
  sourceOptions: MultiselectOption[] = [
    { value: 'armed', label: 'Armed' },
    { value: 'protected', label: 'Protected' },
  ];
  sourceValue = ['armed'];
  edits: string[][] = [];
  ngDoCheck() {
    this.checks++;
  }
  // Match the derived arrays returned by equipment and item editors. The limit
  // lets a regression fail rather than starving the browser with microtasks.
  get options() {
    return this.checks < 30 ? this.sourceOptions.map((option) => ({ ...option })) : this.sourceOptions;
  }
  get value() {
    return this.checks < 30 ? [...this.sourceValue] : this.sourceValue;
  }
  update(value: string[]) {
    this.sourceValue = value;
    this.edits.push(value);
  }
}

describe('Multiselect change detection', () => {
  it('settles with derived arrays instead of repeatedly scheduling model updates', async () => {
    const fixture = TestBed.createComponent(EffectsHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.checks).toBeLessThan(10);
    expect(fixture.nativeElement.textContent).toContain('Armed');
    expect(fixture.componentInstance.edits).toEqual([]);
  });

  it('updates labels, disabled options and selections when their contents change', async () => {
    const fixture = TestBed.createComponent(EffectsHost),
      host = fixture.componentInstance;
    fixture.autoDetectChanges();
    await fixture.whenStable();
    host.sourceOptions[1].label = 'Ward active';
    host.sourceOptions[0].disabled = true;
    host.sourceOptions[0].reason = 'Unavailable';
    host.sourceValue.splice(0, 1, 'protected');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.multiselect-label').textContent).toBe('Ward active');
    const control = fixture.debugElement.query(By.directive(MultiselectComponent)).componentInstance as MultiselectComponent;
    expect(control.options[0].disabled).toBeTrue();
    expect(control.options[0].reason).toBe('Unavailable');
    expect(host.edits).toEqual([]);
    fixture.nativeElement.querySelector('[aria-label="Remove Ward active"]').click();
    await fixture.whenStable();
    expect(host.sourceValue).toEqual([]);
    expect(host.edits).toEqual([[]]);
    expect(host.checks).toBeLessThan(15);
  });
});
