import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../shared/services/dialog.service';
import { FlagsEditorComponent } from './flags-editor.component';
import { EntityFlagsComponent } from './entity-flags.component';
import { ConditionEditorComponent } from './condition-editor.component';
import { OutcomeEditorComponent } from './outcome-editor.component';
import { PlayerComponent } from './player.component';
import { flagsFixture } from '../../engine/story-flags-fixture';
import { startGame } from '../../engine/story-engine';
import { always, copy } from '../../models/story.model';
import { StoryManagerSerializationService } from '../../services/story-manager-serialization.service';

describe('Flag authoring and reader integration', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, FlagsEditorComponent, EntityFlagsComponent, ConditionEditorComponent, OutcomeEditorComponent, PlayerComponent],
      providers: [
        { provide: StoryManagerSerializationService, useValue: { data: { playthroughs: [] }, commit: jasmine.createSpy() } },
        { provide: DialogService, useValue: {} },
      ],
    }).compileComponents();
  });
  it('creates editable stored variables without computed rule controls', async () => {
    const fixture = TestBed.createComponent(FlagsEditorComponent),
      c = fixture.componentInstance;
    c.story = flagsFixture();
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
    c.story = flagsFixture();
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
    c.story = flagsFixture();
    c.add();
    const original = c.selected;
    original.scope = 'character';
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
    expect(c.story.entities).toEqual(before.entities);
    c.selected.initial = 20;
    expect(original.initial).toBe(12);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('option[value="character"]').textContent).toBe('Character');
  });
  it('assigns starting Boolean values and object grants while retaining invalid references for repair', async () => {
    const fixture = TestBed.createComponent(EntityFlagsComponent),
      c = fixture.componentInstance;
    c.story = flagsFixture();
    c.entity = c.story.entities.find((e) => e.id === 'player');
    c.setValue('armed', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.entity.variableValues['armed']).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Starting variables');
    c.story.flags = c.story.flags.filter((f) => f.id !== 'armed');
    fixture.detectChanges();
    expect(c.invalidValues).toEqual(['armed']);
    expect(fixture.nativeElement.textContent).toContain('Invalid starting variable');
    c.resetValue('armed');
    c.entity = c.story.entities.find((e) => e.id === 'coat');
    c.setEffects(['top', 'cursed']);
    expect(c.entity.flagGrants[1].when).toBe('equipped');
    c.setEffects(['cursed']);
    expect(c.entity.flagGrants.length).toBe(1);
  });
  it('offers Boolean variables in both checks and direct effects', async () => {
    const conditionFixture = TestBed.createComponent(ConditionEditorComponent),
      condition = conditionFixture.componentInstance;
    condition.story = flagsFixture();
    condition.condition = { ...always(), kind: 'flag', actor: 'player', target: 'naked' };
    conditionFixture.detectChanges();
    await conditionFixture.whenStable();
    expect(conditionFixture.nativeElement.textContent).toContain('Fully clothed');
    const effectsFixture = TestBed.createComponent(OutcomeEditorComponent),
      effects = effectsFixture.componentInstance;
    effects.story = condition.story;
    effects.steps = [];
    effects.add('effect');
    const step = effects.steps[0];
    if (step.kind === 'effect') step.effect.kind = 'removeFlag';
    effectsFixture.detectChanges();
    await effectsFixture.whenStable();
    expect(effectsFixture.nativeElement.textContent).toContain('Sets the direct value to false');
    expect(effectsFixture.nativeElement.textContent).toContain('Fully clothed');
  });
  it('keeps broken flag checks inspectable during scene testing instead of crashing the reader', async () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = flagsFixture();
    c.testScene = c.story.start;
    c.ngOnChanges();
    c.story.scenes[0].passages[0].choices[0].available = { ...always(), kind: 'flag', actor: 'player', target: 'deleted' };
    await c.start();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.allowed(c.passage.choices[0].id)).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Boolean check needs a valid variable and character when applicable.');
  });
  it('shows only visible active flags on known characters and never exposes their sources', async () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = flagsFixture();
    c.story.flags.find((f) => f.id === 'armed').visible = true;
    c.story.flags.find((f) => f.id === 'armed').description = 'Ready to fight.';
    c.story.entities.find((e) => e.id === 'player').initialFlags = ['cursed'];
    const game = startGame(c.story, 'Reader');
    c.persistence.data.playthroughs = [game];
    c.inspected = 'player';
    fixture.detectChanges();
    await fixture.whenStable();
    const flags = fixture.nativeElement.querySelectorAll('.reader-character-variable');
    expect(flags.length).toBe(1);
    expect(flags[0].textContent).toContain('armed');
    expect(flags[0].textContent).toContain('true');
    expect(fixture.nativeElement.textContent).not.toContain('Direct value');
    expect(fixture.nativeElement.textContent).not.toContain('Sword (owned)');
    c.story.flags.find((f) => f.id === 'cursed').visible = true;
    c.story.entities.find((e) => e.id === 'player').known = false;
    game.state.known = game.state.known.filter((id) => id !== 'player');
    c.inspected = 'Mira';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.reader-character-variable').length).toBe(0);
  });
  it('allows isolated direct-flag setup, explains equipment sources, and preserves undo', async () => {
    const fixture = TestBed.createComponent(PlayerComponent),
      c = fixture.componentInstance;
    c.story = flagsFixture();
    c.testScene = c.story.start;
    c.ngOnChanges();
    const original = copy(c.story);
    c.setDirectFlag('player', 'bottom', true);
    await c.start();
    expect(c.statuses('player', c.game.state).find((s) => s.flag.id === 'bottom').active).toBeTrue();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Current Boolean variables');
    expect(fixture.nativeElement.textContent).toContain('Direct value');
    expect(fixture.nativeElement.textContent).toContain('coat (equipped)');
    await c.select(c.passage.choices[0].id);
    c.undo();
    expect(c.game.state.characterValues['player']['bottom']).toBeTrue();
    expect(c.story).toEqual(original);
    expect(c.persistence.commit).not.toHaveBeenCalled();
  });
});
