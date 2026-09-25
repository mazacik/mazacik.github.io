import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgSelectComponent } from '@ng-select/ng-select';
import { Tag } from '../../models/tag.class';
import { TagCreateComponent } from './tag-create.component';

describe('TagCreateComponent', () => {
  let fixture: ComponentFixture<TagCreateComponent>;
  let resolve: jasmine.Spy;
  let animals: Tag;
  let dogs: Tag;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TagCreateComponent] }).compileComponents();
    animals = Object.assign(new Tag(), { id: 'animals', name: 'Animals', group: true, parent: null, children: [] });
    dogs = Object.assign(new Tag(), { id: 'dogs', name: 'Dogs', group: true, parent: animals, children: [] });
    fixture = TestBed.createComponent(TagCreateComponent);
    resolve = jasmine.createSpy('resolve');
    fixture.componentInstance.resolve = resolve;
    fixture.componentInstance.inputs = {
      group: false,
      parentGroups: [animals, dogs],
      initialParent: null,
      validateName: (name, parent) => parent === dogs && name === 'Taken' ? 'Duplicate name.' : null
    };
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function enterName(value: string): Promise<void> {
    const input = fixture.nativeElement.querySelector('#gallery-tag-create-name') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await render();
  }

  function createDisabled(): boolean {
    return fixture.componentInstance.configuration.footerButtons[1].disabled();
  }

  async function openParents(): Promise<HTMLElement[]> {
    fixture.debugElement.query(By.directive(NgSelectComponent)).componentInstance.open();
    await render();
    return Array.from(document.body.querySelectorAll<HTMLElement>('.gallery-tag-parent-select.ng-dropdown-panel .ng-option'));
  }

  async function selectParent(label: string): Promise<void> {
    const options = await openParents();
    const option = options.find(option => option.textContent.trim() === label);
    expect(option).toBeDefined();
    option.click();
    await render();
  }

  it('shows Parent group above Name using ng-select, with Root selected and full-path options', async () => {
    await render();
    expect(fixture.componentInstance.configuration.title).toBe('Create Tag');
    expect([...fixture.nativeElement.querySelectorAll('label')].map((label: HTMLLabelElement) => label.textContent)).toEqual(['Parent group', 'Name']);
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.querySelector('ng-select .ng-value-label').textContent.trim()).toBe('Root');
    expect((await openParents()).map(option => option.textContent.trim())).toEqual(['Root', 'Animals', 'Animals | Dogs']);
    expect(createDisabled()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.validation-message')).toBeNull();
  });

  it('preselects the source group when creating a tag group', async () => {
    fixture.componentInstance.inputs.group = true;
    fixture.componentInstance.inputs.initialParent = dogs;
    await render();
    expect(fixture.componentInstance.configuration.title).toBe('Create Tag Group');
    expect(fixture.nativeElement.querySelector('ng-select .ng-value-label').textContent.trim()).toBe('Animals | Dogs');
  });

  it('keeps the name and revalidates immediately when the parent changes', async () => {
    await render();
    await enterName('Taken');
    expect(createDisabled()).toBeFalse();
    await selectParent('Animals | Dogs');
    expect((fixture.nativeElement.querySelector('#gallery-tag-create-name') as HTMLInputElement).value).toBe('Taken');
    expect(createDisabled()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.validation-message').textContent).toBe('Duplicate name.');
    fixture.componentInstance.submit();
    expect(resolve).not.toHaveBeenCalled();

    await selectParent('Animals');
    expect(createDisabled()).toBeFalse();
    fixture.componentInstance.submit();
    expect(resolve).toHaveBeenCalledOnceWith({ name: 'Taken', parent: animals });
  });

  it('can create at Root when there are no groups', async () => {
    fixture.componentInstance.inputs.parentGroups = [];
    await render();
    expect((await openParents()).map(option => option.textContent.trim())).toEqual(['Root']);
    await selectParent('Root');
    await enterName('New tag');
    fixture.componentInstance.submit();
    expect(resolve).toHaveBeenCalledOnceWith({ name: 'New tag', parent: null });
  });

  it('searches full paths and lets a nested selection return to Root', async () => {
    fixture.componentInstance.inputs.initialParent = dogs;
    await render();
    await openParents();
    const search = fixture.nativeElement.querySelector('#gallery-tag-create-parent') as HTMLInputElement;
    search.value = 'Animals | Dogs';
    search.dispatchEvent(new Event('input'));
    await render();
    const options = Array.from(document.body.querySelectorAll<HTMLElement>('.gallery-tag-parent-select.ng-dropdown-panel .ng-option'));
    expect(options.map(option => option.textContent.trim())).toEqual(['Animals | Dogs']);
    options[0].click();
    await render();
    await selectParent('Root');
    await enterName('New tag');
    fixture.componentInstance.submit();
    expect(resolve).toHaveBeenCalledOnceWith({ name: 'New tag', parent: null });
  });

  it('rejects whitespace names silently and returns undefined on cancel', async () => {
    await render();
    await enterName('   ');
    fixture.componentInstance.submit();
    expect(resolve).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.validation-message')).toBeNull();
    expect(createDisabled()).toBeTrue();
    fixture.componentInstance.close();
    expect(resolve).toHaveBeenCalledOnceWith(undefined);
  });
});
