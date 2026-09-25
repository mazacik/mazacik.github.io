import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LayersEditorComponent } from './layers-editor.component';
import { PlayerComponent } from './player.component';
import { OutcomeEditorComponent } from './outcome-editor.component';
import { DialogService } from '../../../shared/services/dialog.service';
import { StoryManagerSerializationService } from '../../services/story-manager-serialization.service';
import { layersFixture } from '../../engine/story-layers-fixture';
import { startGame } from '../../engine/story-engine';
import { playableFingerprint } from '../../engine/story-order';
import { copy, Playthrough } from '../../models/story.model';
import { ListReorderDirective } from './list-reorder.directive';
import { MultiselectComponent } from '../../../shared/components/multiselect/multiselect.component';

describe('Layer editing and player equipment controls', () => {
  let dialogs: { createInput: jasmine.Spy; createConfirmation: jasmine.Spy };
  let persistence: { data: { playthroughs: Playthrough[] }; commit: jasmine.Spy };
  beforeEach(() => {
    dialogs = { createInput: jasmine.createSpy().and.resolveTo(''), createConfirmation: jasmine.createSpy().and.resolveTo(true) };
    persistence = {
      data: { playthroughs: [] },
      commit: jasmine.createSpy().and.callFake(async (game: Playthrough) => {
        persistence.data.playthroughs = [game];
      }),
    };
    TestBed.configureTestingModule({
      imports: [LayersEditorComponent, PlayerComponent, OutcomeEditorComponent],
      providers: [
        { provide: DialogService, useValue: dialogs },
        { provide: StoryManagerSerializationService, useValue: persistence },
      ],
    });
  });
  it('edits explicit coverage and prevents cycles', async () => {
    const fixture = TestBed.createComponent(LayersEditorComponent),
      c = fixture.componentInstance;
    c.story = layersFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    const sections = [...fixture.nativeElement.querySelectorAll('section')] as HTMLElement[];
    const shirt = sections.find((s) => s.dataset['reorderId'] === 'Shirt');
    expect(shirt.querySelector('input[type=checkbox]')).toBeNull();
    const select = fixture.debugElement
      .queryAll(By.directive(MultiselectComponent))
      .map((d) => d.componentInstance as MultiselectComponent)
      .find((s) => s.label === 'Shirt covers');
    select.select.open();
    fixture.detectChanges();
    await fixture.whenStable();
    const armourOption = Array.from(document.querySelectorAll<HTMLElement>('.ng-option')).find((o) => o.textContent.includes('Armour'));
    expect(armourOption.classList).toContain('ng-option-disabled');
    expect(armourOption.textContent).toContain('coverage cycle');
    armourOption.click();
    expect(c.covers('Shirt', 'Armour')).toBeFalse();
    const before = copy(c.story.layerCoverage);
    c.setCoveredLayers('Shirt', ['Armour']);
    expect(c.story.layerCoverage).toEqual(before);
    c.setCoveredLayers('Armour', ['Shirt', 'Helmet']);
    expect(c.covers('Armour', 'Helmet')).toBeTrue();
    c.setCoveredLayers('Armour', ['Shirt']);
    expect(c.covers('Armour', 'Helmet')).toBeFalse();
  });
  it('searches, selects with the keyboard and removes coverage chips without reordering layers', async () => {
    const fixture = TestBed.createComponent(LayersEditorComponent),
      c = fixture.componentInstance;
    c.story = layersFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    const row = fixture.nativeElement.querySelector('[data-reorder-id="Armour"]') as HTMLElement;
    const input = row.querySelector('input');
    const slots = [...c.story.slots];
    input.value = 'Helmet';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelectorAll('.ng-option').length).toBe(1);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.covers('Armour', 'Helmet')).toBeTrue();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(document.querySelector('.ng-dropdown-panel')).toBeNull();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
    expect(c.story.slots).toEqual(slots);
    row.querySelector<HTMLButtonElement>('[aria-label="Remove Helmet"]').click();
    fixture.detectChanges();
    expect(c.story.layerCoverage['Armour']).toEqual(['Shirt']);
  });
  it('keeps invalid saved links removable and does not write on open or search', async () => {
    const fixture = TestBed.createComponent(LayersEditorComponent),
      c = fixture.componentInstance;
    c.story = layersFixture();
    c.story.layerCoverage['Shirt'] = ['Shirt', 'Missing'];
    const changed = spyOn(c.changed, 'emit');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('[data-reorder-id="Shirt"]') as HTMLElement;
    expect(row.textContent).toContain('Missing layer: Missing');
    const select = fixture.debugElement
      .queryAll(By.directive(MultiselectComponent))
      .map((d) => d.componentInstance as MultiselectComponent)
      .find((s) => s.label === 'Shirt covers');
    select.select.open();
    fixture.detectChanges();
    expect(changed).not.toHaveBeenCalled();
    document.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(document.querySelector('.ng-dropdown-panel')).toBeNull();
    row.querySelector<HTMLButtonElement>('[aria-label="Remove Missing layer: Missing"]').click();
    row.querySelector<HTMLButtonElement>('[aria-label="Remove Shirt"]').click();
    expect(c.story.layerCoverage['Shirt']).toEqual([]);
  });
  it('renames references, repairs deleted coverage and leaves missing assignments visible', async () => {
    const c = TestBed.createComponent(LayersEditorComponent).componentInstance;
    c.story = layersFixture();
    dialogs.createInput.and.resolveTo('Tunic');
    await c.rename('Shirt');
    expect(c.story.layerCoverage['Armour']).toEqual(['Tunic']);
    expect(c.story.layerCoverage['Tunic']).toEqual(['Underwear']);
    expect(c.story.entities.find((e) => e.id === 'dagger').requiredSlots).toEqual(['Tunic']);
    dialogs.createConfirmation.and.resolveTo(false);
    await c.remove('Tunic');
    expect(c.story.slots).toContain('Tunic');
    dialogs.createConfirmation.and.resolveTo(true);
    await c.remove('Tunic');
    expect(c.story.layerCoverage['Armour']).toEqual([]);
    expect(c.story.layerCoverage['Tunic']).toBeUndefined();
    expect(c.story.entities.find((e) => e.id === 'dagger').requiredSlots).toEqual(['Tunic']);
    expect(c.story.slots).not.toContain('Tunic');
  });
  it('adds unique layers and reorders with the shared keyboard/drag behavior without changing gameplay', async () => {
    const fixture = TestBed.createComponent(LayersEditorComponent),
      c = fixture.componentInstance;
    c.story = layersFixture();
    dialogs.createInput.and.resolveTo('Helmet');
    await c.add();
    expect(c.error).toContain('unique');
    dialogs.createInput.and.resolveTo('Boots');
    await c.add();
    expect(c.story.slots.at(-1)).toBe('Boots');
    fixture.detectChanges();
    const before = playableFingerprint(c.story);
    const row = fixture.nativeElement.querySelector('[data-reorder-id="Shirt"]') as HTMLElement;
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
    expect(c.story.slots[0]).toBe('Shirt');
    const directive = fixture.debugElement.query(By.directive(ListReorderDirective)).injector.get(ListReorderDirective);
    directive.reordered.emit({ id: 'Shirt', offset: 2 });
    expect(c.story.slots[2]).toBe('Shirt');
    expect(playableFingerprint(c.story)).toBe(before);
  });
  it('renders blocked player controls, persists accessible actions and updates availability', async () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = layersFixture();
    const original = startGame(c.story, 'Saved');
    persistence.data.playthroughs = [original];
    c.gearView = 'equipment';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Blocked by Armour');
    const shirtRow = [...fixture.nativeElement.querySelectorAll('.equipment-view .gear-row')].find((p: HTMLElement) => p.textContent.includes('Linen shirt')) as HTMLElement;
    expect(shirtRow.querySelector('.gear-action').hasAttribute('disabled')).toBeTrue();
    await c.changeEquipment('Armour-copy', false);
    expect(c.equipmentReason('dagger-1', false)).toBe('');
    expect(persistence.commit).toHaveBeenCalledTimes(1);
    expect(c.game.state.equipment['player']['Armour']).toBeUndefined();
    expect(original.state.equipment['player']['Armour']).toBe('Armour-copy');
    expect(c.game.transcript.slice(0, original.transcript.length)).toEqual(original.transcript);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.transcript .equipment-action').textContent).toContain('Unequipped Armour.');
    expect(c.currentTranscript).toEqual(original.transcript[0]);
  });
  it('keeps failed saves and simultaneous actions from changing the displayed game', async () => {
    const c = TestBed.createComponent(PlayerComponent).componentInstance;
    c.story = layersFixture();
    const original = startGame(c.story, 'Saved');
    persistence.data.playthroughs = [original];
    let rejectSave: (error: Error) => void;
    persistence.commit.and.callFake(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        }),
    );
    const pending = c.changeEquipment('Armour-copy', false);
    expect(c.busy).toBeTrue();
    await c.changeEquipment('Helmet-copy', false);
    expect(persistence.commit).toHaveBeenCalledTimes(1);
    rejectSave(new Error('Checkpoint failed'));
    await pending;
    expect(c.game).toBe(original);
    expect(c.error).toBe('Checkpoint failed');
    expect(c.busy).toBeFalse();
    c.story.revision++;
    await c.changeEquipment('Helmet-copy', false);
    expect(persistence.commit).toHaveBeenCalledTimes(1);
  });
  it('supports equipment undo in scene tests without touching saves or definitions', async () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = layersFixture();
    c.testScene = c.story.start;
    c.ngOnChanges();
    await c.start();
    const original = copy(c.game),
      storyBefore = copy(c.story);
    await c.changeEquipment('Armour-copy', false);
    await c.changeEquipment('dagger-1', false);
    expect(c.game.state.equipment['player']['Shirt']).toBeUndefined();
    c.undo();
    c.undo();
    expect(c.game).toEqual(original);
    expect(c.story).toEqual(storyBefore);
    expect(persistence.commit).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Undo choice');
  });
  it('shows the dialogue override only on actions that can need layer access', () => {
    const fixture = TestBed.createComponent(OutcomeEditorComponent),
      c = fixture.componentInstance;
    c.story = layersFixture();
    for (const kind of ['equip', 'unequip', 'removeEquipment', 'transferEquipment', 'giveEquipment', 'giveQuantity'] as const) {
      c.steps = [{ id: 'effect', kind: 'effect', effect: { kind, target: 'dagger-1', actor: 'player', value: '' } }];
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent.includes('Ignore blocked access')).toBe(!['giveEquipment', 'giveQuantity'].includes(kind));
    }
  });
});
