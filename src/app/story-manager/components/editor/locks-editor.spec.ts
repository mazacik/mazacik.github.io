import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DialogService } from '../../../shared/services/dialog.service';
import { StoryManagerSerializationService } from '../../services/story-manager-serialization.service';
import { copy, Playthrough, variableKey } from '../../models/story.model';
import { locksFixture, dispelMethod } from '../../engine/story-locks-fixture';
import { startGame } from '../../engine/story-engine';
import { unlockRandomKey } from '../../engine/story-locks';
import { LocksEditorComponent } from './locks-editor.component';
import { KeyPickerComponent } from './key-picker.component';
import { CharacterEquipmentComponent } from './character-equipment.component';
import { OutcomeEditorComponent } from './outcome-editor.component';
import { PlayerComponent } from './player.component';

describe('Lock authoring and player unlock controls', () => {
  let dialogs: { createInput: jasmine.Spy; createConfirmation: jasmine.Spy };
  let persistence: { data: { playthroughs: Playthrough[] }; commit: jasmine.Spy };
  beforeEach(() => {
    dialogs = { createInput: jasmine.createSpy().and.resolveTo('Master key'), createConfirmation: jasmine.createSpy().and.resolveTo(true) };
    persistence = {
      data: { playthroughs: [] },
      commit: jasmine.createSpy().and.callFake(async (game: Playthrough) => {
        persistence.data.playthroughs = [game];
      }),
    };
    TestBed.configureTestingModule({
      imports: [LocksEditorComponent, CharacterEquipmentComponent, KeyPickerComponent, OutcomeEditorComponent, PlayerComponent],
      providers: [
        { provide: DialogService, useValue: dialogs },
        { provide: StoryManagerSerializationService, useValue: persistence },
      ],
    });
  });
  it('creates keys, limits the picker to keys, and removes missing references', async () => {
    const fixture = TestBed.createComponent(KeyPickerComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    c.story.entities.push({ ...c.story.entities.find((e) => e.id === 'apple'), id: 'ordinary-item', name: 'Ordinary item' });
    c.keys = ['missing'];
    c.keysChange.subscribe((keys) => (c.keys = keys));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Missing key');
    c.setKeys([]);
    c.setKeys(['ordinary-item']);
    expect(c.keys).toEqual([]);
    c.setKeys(['apple']);
    await c.create();
    const key = c.story.entities.at(-1);
    expect(key.name).toBe('Master key');
    expect(key.kind).toBe('object');
    expect(key.key).toBeTrue();
    expect(c.keys).toEqual(['apple', key.id]);
    expect(c.story.copies.length).toBe(8);
  });
  it('offers contextual references and restricts attempt costs and recursive actions', async () => {
    const fixture = TestBed.createComponent(LocksEditorComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    c.entity = c.story.entities.find((e) => e.id === 'dagger');
    c.entity.unlockMethods.push(dispelMethod());
    c.entity.unlockMethods.forEach((method) => c.selectMethodSection(method, 'Attempt'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Acting character');
    expect(fixture.nativeElement.textContent).toContain('Wearer');
    expect(fixture.nativeElement.textContent).toContain('This equipment copy');
    const outcomes = fixture.debugElement.queryAll(By.directive(OutcomeEditorComponent)).map((d) => d.componentInstance as OutcomeEditorComponent);
    expect(outcomes.length).toBe(2);
    expect(outcomes.every((editor) => !editor.allowUnlock && !editor.allowNavigation)).toBeTrue();
    outcomes[0].add('go');
    outcomes[0].add('unlock');
    expect(outcomes[0].steps).toEqual([]);
    c.entity.unlockMethods.forEach((method) => c.selectMethodSection(method, 'Results'));
    fixture.detectChanges();
    await fixture.whenStable();
    const results = fixture.debugElement.queryAll(By.directive(OutcomeEditorComponent)).map((d) => d.componentInstance as OutcomeEditorComponent);
    expect(results.length).toBe(4);
    expect(results.every((editor) => !editor.allowUnlock && editor.allowNavigation)).toBeTrue();
    const texts = Array.from(fixture.nativeElement.querySelectorAll('textarea')) as HTMLTextAreaElement[];
    texts[0].value = 'A long result.\n'.repeat(25);
    texts[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(texts[0].style.height).not.toBe('');
  });
  it('switches method sections independently without changing authored methods and retains edits', async () => {
    const fixture = TestBed.createComponent(LocksEditorComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    c.entity = c.story.entities.find((e) => e.id === 'dagger');
    const first = c.entity.unlockMethods[0],
      second = dispelMethod();
    c.entity.unlockMethods.push(second);
    const before = copy(c.story),
      changed = spyOn(c.changed, 'emit');
    fixture.detectChanges();
    await fixture.whenStable();
    const methods = fixture.nativeElement.querySelectorAll('.unlock-method') as NodeListOf<HTMLDetailsElement>;
    methods.forEach((method) => (method.open = true));
    const tab = (name: string) => Array.from(methods[0].querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((button) => button.textContent.trim() === name);
    expect(methods[0].querySelector('story-outcomes')).toBeNull();
    tab('Attempt').click();
    fixture.detectChanges();
    expect(c.methodSection(first)).toBe('Attempt');
    expect(c.methodSection(second)).toBe('Requirements');
    expect(methods[0].querySelectorAll('story-outcomes').length).toBe(1);
    expect(c.story).toEqual(before);
    expect(changed).not.toHaveBeenCalled();
    const chance = methods[0].querySelector<HTMLInputElement>('input[type="number"]');
    chance.value = '35';
    chance.dispatchEvent(new Event('input'));
    expect(first.chance).toBe(35);
    expect(changed).toHaveBeenCalledTimes(1);
    tab('Attempt').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(c.methodSection(first)).toBe('Results');
    expect(methods[0].querySelectorAll('story-outcomes').length).toBe(2);
    expect(methods[0].querySelectorAll('[role="tab"][tabindex="0"]').length).toBe(1);
    expect(methods[0].querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(tab('Results').id);
    tab('Results').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(c.methodSection(first)).toBe('Requirements');
    tab('Attempt').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(first.chance).toBe(35);
    expect(changed).toHaveBeenCalledTimes(1);
  });
  it('edits locks directly on equipment and excludes equipment types', () => {
    const fixture = TestBed.createComponent(LocksEditorComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    const base = c.story.entities.find((e) => e.id === 'dagger');
    const type = { ...copy(base), id: 'equipment-type', equipmentRole: 'type' as const };
    c.story.entities.push(type);
    base.equipmentRole = 'variant';
    base.parentId = type.id;
    c.entity = base;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('type methods');
    expect(fixture.nativeElement.textContent).not.toContain('type default');
    const before = type.unlockMethods.length;
    c.addMethod();
    expect(base.unlockMethods.length).toBe(before + 1);
    expect(type.unlockMethods.length).toBe(before);
    c.entity = type;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    c.addMethod();
    expect(type.unlockMethods.length).toBe(before);
  });
  it('clears starting locks when unequipped or unassigned and duplicates copies unlocked', () => {
    const c = TestBed.createComponent(CharacterEquipmentComponent).componentInstance;
    c.story = locksFixture();
    c.entity = c.story.entities.find((e) => e.id === 'player');
    const first = c.story.copies[0];
    c.duplicateCopy(first);
    expect(c.story.copies.at(-1).locked).toBeFalse();
    expect(c.story.copies.at(-1).owner).toBe('player');
    c.setKeys(first, true);
    expect(first.keyItems).toEqual(['apple']);
    c.setKeys(first, false);
    expect(first.keyItems).toBeUndefined();
    c.setEquipped(first, false);
    expect(first.locked).toBeFalse();
    first.equipped = first.locked = true;
    c.removeFromInventory(first);
    expect(first.locked).toBeFalse();
    expect(first.equipped).toBeFalse();
  });
  it('offers Lock beside Unequip, saves the locked copy, and switches to unlock methods', async () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    c.story.entities.find((e) => e.id === 'dagger').lockOnEquip = false;
    c.story.copies[0].locked = false;
    const original = startGame(c.story, 'Saved'),
      authored = copy(c.story);
    persistence.data.playthroughs = [original];
    fixture.detectChanges();
    const lockButtons = () => Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).filter((b) => b.textContent.trim() === 'Lock');
    expect(lockButtons().length).toBe(0);
    c.gearView = 'equipment';
    fixture.detectChanges();
    expect(lockButtons().length).toBe(1);
    c.story.layerCoverage = { Armour: ['Shirt'] };
    fixture.detectChanges();
    expect(lockButtons()[0].disabled).toBeTrue();
    expect(c.equipmentReason('dagger-1', 'lock')).toContain('Armour');
    c.story.layerCoverage = {};
    fixture.detectChanges();
    expect(lockButtons()[0].disabled).toBeFalse();
    lockButtons()[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(persistence.commit).toHaveBeenCalledTimes(1);
    expect(c.game.state.copyStates['dagger-1'].locked).toBeTrue();
    expect(original.state.copyStates['dagger-1'].locked).toBeFalsy();
    expect(lockButtons().length).toBe(0);
    expect(fixture.nativeElement.querySelector('[data-item-id="dagger-1"]').textContent).toContain('Use key');
    expect(c.story).toEqual(authored);
  });
  it('undoes manual locking in scene tests and retains saved state if locking cannot be committed', async () => {
    const c = TestBed.createComponent(PlayerComponent).componentInstance;
    c.story = locksFixture();
    c.story.copies[0].locked = false;
    c.testScene = c.story.start;
    c.ngOnChanges();
    await c.start();
    const before = copy(c.game);
    await c.changeEquipment('dagger-1', 'lock');
    expect(c.game.state.copyStates['dagger-1'].locked).toBeTrue();
    c.undo();
    expect(c.game).toEqual(before);
    expect(persistence.commit).not.toHaveBeenCalled();
    c.testScene = '';
    persistence.data.playthroughs = [before];
    let rejectSave: (error: Error) => void;
    persistence.commit.and.callFake(() => new Promise<void>((_, reject) => (rejectSave = reject)));
    const pending = c.changeEquipment('dagger-1', 'lock');
    await c.changeEquipment('dagger-1', 'lock');
    expect(persistence.commit).toHaveBeenCalledTimes(1);
    rejectSave(new Error('Checkpoint failed'));
    await pending;
    expect(c.game).toBe(before);
    expect(c.error).toBe('Checkpoint failed');
    expect(c.busy).toBeFalse();
  });
  it('keeps Unequip and unavailable methods visible with reasons and persists successful attempts', async () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    const method = dispelMethod();
    method.available = { kind: 'flag', target: 'alert', actor: '', children: [], op: 'eq', value: '' };
    method.explanation = 'No sharp object is available.';
    c.story.entities.find((e) => e.id === 'dagger').unlockMethods.push(method);
    const original = startGame(c.story, 'Saved');
    persistence.data.playthroughs = [original];
    c.gearView = 'equipment';
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Locked');
    expect(text).toContain('Use key');
    expect(text).toContain('No sharp object');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.find((b) => b.textContent.trim() === 'Dispel curse').disabled).toBeTrue();
    expect(buttons.find((b) => b.textContent.trim() === 'Use key').disabled).toBeFalse();
    await c.unlock('dagger-1', 'key-method');
    expect(persistence.commit).toHaveBeenCalledTimes(1);
    expect(c.game.state.copyStates['dagger-1'].locked).toBeFalse();
    expect(c.currentTranscript).toEqual(original.transcript[0]);
    expect(c.lastAttempt.parts[0].text).toBe('Unlocked.');
    expect(original.state.copyStates['dagger-1'].locked).toBeTrue();
    fixture.detectChanges();
    const entry = fixture.nativeElement.querySelector('.equipment-attempt.player-action') as HTMLElement;
    expect(entry.querySelector('h3').textContent).toBe('You');
    expect(entry.querySelector('.prose').textContent).toBe('Use key: Guard handcuffs');
    expect(entry.querySelector('.action-result').textContent.trim()).toBe('Unlocked.');
    expect(entry.textContent).not.toContain('player -');
  });
  it('formats older unlock entries consistently without changing saved history', () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    const game = startGame(c.story, 'Saved');
    game.transcript.push({
      kind: 'equipmentAttempt',
      scene: game.scene,
      passage: game.passage,
      speaker: 'Player - Unlock - Handcuffs',
      parts: [{ text: 'The attempt failed.' }],
      attempt: { target: 'dagger-1', actor: c.story.player, method: 'key-method', succeeded: false },
    });
    persistence.data.playthroughs = [game];
    const before = copy(game);
    fixture.detectChanges();
    const entry = fixture.nativeElement.querySelector('.equipment-attempt.player-action') as HTMLElement;
    expect(entry.querySelector('h3').textContent).toBe('You');
    expect(entry.querySelector('.prose').textContent).toBe('Unlock: Handcuffs');
    expect(entry.querySelector('.action-result').textContent.trim()).toBe('The attempt failed.');
    expect(game).toEqual(before);
    expect(persistence.commit).not.toHaveBeenCalled();
  });
  it('retains failure costs, forces scene-test outcomes and restores the complete attempt with undo', async () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    c.story.entities.find((e) => e.id === 'dagger').unlockMethods.push(dispelMethod());
    c.testScene = c.story.start;
    c.ngOnChanges();
    await c.start();
    const before = copy(c.game),
      authored = copy(c.story);
    c.forcedUnlock[unlockRandomKey('dagger-1', 'dispel')] = 'failure';
    await c.unlock('dagger-1', 'dispel');
    expect(c.game.state.storyValues['alert']).toBeTrue();
    expect(c.game.state.characterValues['player']['magic']).toBe(0);
    expect(c.lastAttempt.attempt.succeeded).toBeFalse();
    c.undo();
    expect(c.game).toEqual(before);
    c.forcedUnlock[unlockRandomKey('dagger-1', 'dispel')] = 'success';
    await c.unlock('dagger-1', 'dispel');
    expect(c.game.state.copyStates['dagger-1'].locked).toBeFalse();
    expect(c.story).toEqual(authored);
    expect(persistence.commit).not.toHaveBeenCalled();
  });
  it('forces nested method random outcomes and offers isolated physical-state setup', async () => {
    const c = TestBed.createComponent(PlayerComponent).componentInstance;
    c.story = locksFixture();
    const method = dispelMethod();
    method.yes = [
      {
        id: 'method-random',
        kind: 'random',
        branches: [
          { id: 'quiet', percent: 50, steps: [] },
          { id: 'loud', percent: 50, steps: [{ id: 'alert', kind: 'effect', effect: { kind: 'addFlag', actor: '', target: 'alert', value: '' } }] },
        ],
      },
    ];
    c.story.entities.find((e) => e.id === 'dagger').unlockMethods.push(method);
    c.testScene = c.story.start;
    c.ngOnChanges();
    const original = copy(c.story);
    c.setSetupLocked('dagger-1', false);
    expect(c.setup.copyStates['dagger-1'].locked).toBeFalse();
    c.setSetupCondition('dagger-1', 'broken');
    expect(c.itemEquipped('player', 'dagger-1')).toBeFalse();
    c.ngOnChanges();
    await c.start();
    c.forced[unlockRandomKey('dagger-1', 'dispel', 'method-random')] = 1;
    await c.unlock('dagger-1', 'dispel');
    expect(c.game.state.storyValues['alert']).toBeTrue();
    expect(c.story).toEqual(original);
  });
  it('does not expose attempted state after checkpoint failure or allow concurrent actions', async () => {
    const c = TestBed.createComponent(PlayerComponent).componentInstance;
    c.story = locksFixture();
    const original = startGame(c.story, 'Saved');
    persistence.data.playthroughs = [original];
    let rejectSave: (error: Error) => void;
    persistence.commit.and.callFake(() => new Promise<void>((_, reject) => (rejectSave = reject)));
    const pending = c.unlock('dagger-1', 'key-method');
    await c.unlock('dagger-1', 'key-method');
    await c.changeEquipment('Helmet-copy', false);
    expect(persistence.commit).toHaveBeenCalledTimes(1);
    rejectSave(new Error('Checkpoint failed'));
    await pending;
    expect(c.error).toBe('Checkpoint failed');
    expect(c.game).toBe(original);
    expect(c.busy).toBeFalse();
    c.story.revision++;
    await c.unlock('dagger-1', 'key-method');
    expect(persistence.commit).toHaveBeenCalledTimes(1);
  });
  it('offers dialogue helper selection and direct lock effects without recursive method steps', () => {
    const fixture = TestBed.createComponent(OutcomeEditorComponent),
      c = fixture.componentInstance;
    c.story = locksFixture();
    c.steps = [];
    c.add('unlock');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acting character');
    expect(c.methods('dagger-1')[0].id).toBe('key-method');
    c.steps = [];
    c.add('effect');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Lock equipment');
    expect(fixture.nativeElement.textContent).toContain('Repair equipment');
  });
});
