import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoryManagerComponent } from '../../story-manager.component';
import { ApplicationService } from '../../../shared/services/application.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { StoryManagerStateService } from '../../services/story-manager-state.service';
import { StoryManagerSerializationService } from '../../services/story-manager-serialization.service';
import { parseDocument } from '../../services/story-document';
import { storyFixture } from '../../engine/story-fixture';
import { startGame } from '../../engine/story-engine';
import { always, copy, isKey, newUnlockMethod, newFlag, newScene } from '../../models/story.model';
import { SceneMapComponent } from './scene-map.component';

// An iframe gives each case its real CSS viewport, including media queries. Copy
// the test runner's global and Angular styles, so global form resets are covered.
describe('Story panel layout with application styles', () => {
  let fixture: ComponentFixture<StoryManagerComponent>, frame: HTMLIFrameElement;
  let notes: StoryManagerStateService, persistence: any;
  const longName = 'The keeper of the northern gate ' + 'UnbrokenName'.repeat(6);

  beforeEach(async () => {
    const story = storyFixture();
    const actor = story.entities[0],
      object = story.entities.find((e) => e.kind === 'object');
    const equipment = story.entities.find((e) => e.kind === 'equipment');
    actor.name = object.name = equipment.name = longName;
    equipment.requiredSlots = ['Head', 'Body'];
    actor.properties = Array.from({ length: 6 }, (_, i) => ({ id: 'actor-property-' + i, name: longName, type: 'number' as const, initial: i, known: true }));
    equipment.properties = actor.properties.map((p) => ({ ...p, id: 'equipment-' + p.id }));
    object.properties = actor.properties.map((p) => ({ ...p, id: 'object-' + p.id }));
    object.properties.push(...object.properties.map((p) => ({ ...p, id: p.id + '-extra' })));
    actor.inventory = Array.from({ length: 6 }, (_, i) => ({ id: 'inventory-' + i, target: object.id, quantity: i + 1, equipped: false }));
    for (let i = 0; i < 35; i++) {
      story.entities.push({ ...copy(actor), id: 'actor-' + i, inventory: [], properties: [] }, { ...copy(object), id: 'object-' + i, properties: [] });
      story.entities.push({ ...copy(equipment), id: 'equipment-' + i, properties: [] });
      const scene = newScene();
      scene.title = longName;
      story.scenes.push(scene);
    }
    story.flags = Array.from({ length: 35 }, () => ({ ...newFlag(), name: longName }));
    story.flags.push(...actor.properties.map((p) => ({ ...newFlag(), id: p.id, name: p.name, scope: 'character' as const, type: 'number' as const, initial: p.initial })));
    actor.properties = [];
    const variant: typeof equipment = { ...copy(equipment), id: 'sharp-variant', name: longName, parentId: equipment.id, requiredSlots: undefined, properties: [], flagGrants: [] };
    story.entities.push(variant);
    story.copies.push(
      ...Array.from({ length: 3 }, (_, i) => ({
        id: 'worn-copy-' + i,
        definition: equipment.id,
        name: longName,
        owner: actor.id,
        equipped: false,
        values: { ['equipment-actor-property-0']: 20 + i },
      })),
    );
    story.flags.push({ ...newFlag(), id: 'layout-armed', name: longName, scope: 'character' });
    equipment.flagGrants = [{ flag: 'layout-armed', when: 'owned' }];
    variant.propertyOverrides = { 'equipment-actor-property-0': 40 };
    variant.flagGrants = [{ flag: 'layout-armed', when: 'owned', suppressed: true }];
    story.slots.push(longName, 'Lining');
    story.layerCoverage = { Lining: [longName], [longName]: ['Body'], Body: ['Legs'] };
    story.entities.push({ ...copy(equipment), id: 'covering-equipment', requiredSlots: [longName], properties: [], flagGrants: [] });
    story.copies.push({ id: 'covering-copy', definition: 'covering-equipment', name: longName, owner: actor.id, equipped: true, values: {} });
    equipment.lockable = true;
    const key = { ...copy(object), id: 'layout-key', key: true, properties: object.properties.map((p) => ({ ...p, id: 'key-' + p.id })) };
    story.entities.push(key, ...Array.from({ length: 35 }, (_, i) => ({ ...copy(key), id: 'layout-key-' + i, properties: [] })));
    equipment.keyItems = [key.id];
    equipment.unlockMethods = [
      { ...newUnlockMethod(), id: 'layout-key', label: 'Use matching key', requiresKey: true },
      {
        ...newUnlockMethod(),
        id: 'layout-dispel',
        label: 'Dispel the ancient curse',
        requiresAccess: false,
        chance: 50,
        explanation: longName,
        failureMessage: longName,
        available: { ...always(), kind: 'all', children: [{ ...always(), kind: 'not', children: [{ ...always(), kind: 'flag', target: 'layout-armed', actor: '@actor' }] }] },
      },
    ];
    story.copies[0].locked = true;
    story.entities.push({ ...copy(equipment), id: 'layout-equipment-type', equipmentRole: 'type' });
    variant.equipmentRole = 'variant';
    variant.parentId = 'layout-equipment-type';
    story.scenes[0].passages[0].choices[0].available = { ...always(), kind: 'all', children: [{ ...always(), kind: 'any', children: [{ ...always(), kind: 'known', target: actor.id }] }] };
    persistence = { ready: true, data: { stories: [story], playthroughs: [startGame(story, 'Saved game')], articles: [] }, save: jasmine.createSpy(), flush() {} };
    persistence.data.playthroughs[0].transcript[0].parts = [{ text: ('A long remembered journey. ' + longName + '\n').repeat(20) }];
    const dialogs = { createConfirmation: jasmine.createSpy().and.resolveTo(true) };
    notes = new StoryManagerStateService(dialogs as any, persistence);
    notes.articles = parseDocument({
      articles: [
        { id: story.id, title: 'The northern gate', folder: true, text: '', childIds: ['folder', ...Array.from({ length: 35 }, (_, i) => 'note-' + i)] },
        ...Array.from({ length: 35 }, (_, i) => ({ id: 'note-' + i, title: longName, folder: false, text: 'A remembered idea.\n'.repeat(100), childIds: [] })),
        { id: 'folder', title: 'Folder', folder: true, text: '', childIds: ['nested-folder'] },
        { id: 'nested-folder', title: 'Nested folder', folder: true, text: '', childIds: ['nested-note'] },
        { id: 'nested-note', title: longName, folder: false, text: 'A nested idea', childIds: [] },
        ...Array.from({ length: 20 }, (_, i) => ({ id: 'library-' + i, title: longName, folder: true, text: '', childIds: [] })),
      ],
    }).articles;
    notes.articles.filter((n) => n.id === 'folder' || n.id === 'nested-folder').forEach((n) => (n.open = true));
    await TestBed.configureTestingModule({
      imports: [StoryManagerComponent],
      providers: [
        { provide: StoryManagerStateService, useValue: notes },
        { provide: StoryManagerSerializationService, useValue: persistence },
        { provide: DialogService, useValue: dialogs },
        { provide: ApplicationService, useValue: { addHeaderButtons() {}, removeHeaderButtons() {}, changes: signal(false) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(StoryManagerComponent);
  });

  afterEach(() => {
    fixture?.destroy();
    frame?.remove();
  });

  for (const [width, height, fontSize] of [
    [1440, 900, 14],
    [1024, 768, 14],
    [390, 844, 14],
    [390, 844, 28],
  ]) {
    it(`keeps navigation and actions reachable at ${width}x${height}, ${fontSize}px text`, async () => {
      frame = document.createElement('iframe');
      frame.title = 'Story layout regression viewport';
      frame.style.cssText = `position:fixed;top:0;left:0;width:${width}px;height:${height}px;border:0;z-index:9999`;
      document.body.append(frame);
      const doc = frame.contentDocument,
        win = frame.contentWindow;
      doc.documentElement.className = 'light-theme';
      doc.documentElement.style.fontSize = fontSize + 'px';
      doc.body.style.cssText = `font-size:${fontSize}px;color:var(--color-text-secondary)`;
      doc.body.innerHTML =
        '<div style="height:100%;display:flex;flex-direction:column"><div style="flex:0 0 48px">Application header</div><div id="content" style="flex:1;display:flex;min-height:0;min-width:0"></div></div>';
      doc.querySelector('#content').append(fixture.nativeElement);
      const copied = new Set<Node>();
      const render = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        const map = fixture.debugElement.query((el) => el.componentInstance instanceof SceneMapComponent)?.componentInstance as SceneMapComponent;
        if (map) await map.layout();
        fixture.detectChanges();
        const loads: Promise<void>[] = [];
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((source) => {
          if (copied.has(source)) return;
          copied.add(source);
          const clone = source.cloneNode(true) as HTMLLinkElement;
          if (clone.tagName === 'LINK') {
            clone.href = (source as HTMLLinkElement).href;
            loads.push(
              new Promise((resolve) => {
                clone.onload = () => resolve();
                clone.onerror = () => resolve();
              }),
            );
          }
          doc.head.append(clone);
        });
        await Promise.all(loads);
        expect(win.getComputedStyle(doc.body).margin).withContext('Real application stylesheet is loaded').toBe('0px');
      };
      const c = fixture.componentInstance;
      const el = (selector: string) => doc.querySelector<HTMLElement>(selector);
      const visible = (node: Element) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
      const checkWidth = (label: string) => {
        expect(doc.documentElement.scrollWidth)
          .withContext(label + ' page overflow')
          .toBeLessThanOrEqual(width);
        expect(el('.workspace').scrollWidth)
          .withContext(label + ' workspace overflow')
          .toBeLessThanOrEqual(width);
        doc.querySelectorAll<HTMLElement>('input, select, textarea, button, .detail-form, .detail-scroll, .list-scroll').forEach((node) => {
          if (!visible(node)) return;
          const bounds = node.getBoundingClientRect();
          expect(bounds.right)
            .withContext(label + ': ' + node.outerHTML.slice(0, 130))
            .toBeLessThanOrEqual(width + 1);
          if (node.matches('button, .detail-form, .detail-scroll, .list-scroll'))
            expect(node.scrollWidth)
              .withContext(label + ': internal overflow ' + node.className)
              .toBeLessThanOrEqual(node.clientWidth + 1);
        });
      };
      const checkPanels = (label: string) => {
        checkWidth(label);
        const panel = el('.detail-panel'),
          scroll = el('.detail-scroll'),
          toolbar = el('.detail-toolbar');
        expect(panel.getBoundingClientRect().bottom)
          .withContext(label + ' panel bottom')
          .toBeLessThanOrEqual(height);
        expect(scroll.clientHeight)
          .withContext(label + ' usable scroll height')
          .toBeGreaterThan(80);
        const top = toolbar.getBoundingClientRect().top,
          navTop = el('nav').getBoundingClientRect().top,
          tabsTop = el('.detail-tabs')?.getBoundingClientRect().top;
        scroll.scrollTop = scroll.scrollHeight;
        expect(toolbar.getBoundingClientRect().top).toBe(top);
        expect(el('nav').getBoundingClientRect().top).toBe(navTop);
        if (tabsTop !== undefined) expect(el('.detail-tabs').getBoundingClientRect().top).toBe(tabsTop);
        if (scroll.scrollHeight > scroll.clientHeight)
          expect(scroll.scrollTop)
            .withContext(label + ' form scrolls')
            .toBeGreaterThan(0);
        scroll.scrollTop = 0;
        const list = el('.list-panel');
        if (width >= 800) {
          expect(list.getBoundingClientRect().width).toBe(260);
          const controls = el('.list-controls'),
            listScroll = el('.list-scroll'),
            controlsTop = controls.getBoundingClientRect().top,
            footer = el('.list-footer'),
            footerTop = footer.getBoundingClientRect().top;
          expect(footer.getBoundingClientRect().bottom).toBeCloseTo(list.getBoundingClientRect().bottom, 0);
          listScroll.scrollTop = listScroll.scrollHeight;
          if (listScroll.scrollHeight > listScroll.clientHeight) expect(listScroll.scrollTop).toBeGreaterThan(0);
          expect(controls.getBoundingClientRect().top).toBe(controlsTop);
          expect(footer.getBoundingClientRect().top).toBe(footerTop);
          listScroll.scrollTop = 0;
        } else {
          expect(win.getComputedStyle(list).display).toBe('none');
          expect(visible(el('.detail-toolbar .back-list'))).toBeTrue();
        }
        doc.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((box) => {
          if (!visible(box)) return;
          expect(box.getBoundingClientRect().width).toBeCloseTo(18, 1);
          expect(box.getBoundingClientRect().height).toBeCloseTo(18, 1);
        });
        doc.querySelectorAll<HTMLElement>('input:not([type="checkbox"]):not(.detail-title), select').forEach((field) => {
          expect(field.getBoundingClientRect().width).toBeLessThanOrEqual(field.matches('[type="number"]') ? 120 : 360);
        });
        expect(el('.detail-form').getBoundingClientRect().width).toBeLessThanOrEqual(960);
        const field = el('.detail-form input');
        win.focus();
        field?.focus();
        if (field) expect(doc.activeElement).withContext('Focused field').toBe(field);
        if (field) expect(win.getComputedStyle(field).outlineStyle).toBe('none');
      };
      // Optional capture endpoint supplied by a local Karma visual-review config.
      const snapshot = async (view: string) => {
        const args = (window as any).__karma__?.config?.args ?? [];
        if (args.includes('story-layout-snapshots')) await fetch('/story-layout-snapshot', { method: 'POST', body: JSON.stringify({ view, width, height, fontSize }) });
      };
      await render();
      checkWidth('Library');
      el('input[aria-label="Search stories"]').focus();
      expect(win.getComputedStyle(el('input[aria-label="Search stories"]')).outlineStyle).toBe('none');
      expect(el('.library').scrollHeight).toBeGreaterThan(el('.library').clientHeight);
      const card = el('.story-card'),
        title = el('.story-card-title');
      expect(card.querySelector('button, a')).toBeNull();
      expect(card.querySelectorAll('.story-counts > span').length).toBe(7);
      expect(win.getComputedStyle(title).textDecorationLine).toBe('none');
      const cardStyle = win.getComputedStyle(card);
      expect(title.getBoundingClientRect().top - card.getBoundingClientRect().top).toBeCloseTo(parseFloat(cardStyle.paddingTop) + parseFloat(cardStyle.borderTopWidth), 1);
      await snapshot('library');
      c.open(notes.articles[0]);
      const documentBefore = JSON.stringify(persistence.data),
        notesBefore = notes.articles.map((n) => n.text);
      let pagePadding: string;
      for (const tab of ['Characters', 'Items', 'Keys', 'Equipment', 'Variables'] as const) {
        c.setTab(tab);
        c.entityId = c.story.entities.find((e) => (tab === 'Keys' ? isKey(c.story, e) : e.kind === (tab === 'Characters' ? 'character' : tab === 'Equipment' ? 'equipment' : 'object'))).id;
        c.flagId = c.story.flags[0].id;
        await render();
        doc.querySelectorAll('details').forEach((d) => (d.open = true));
        checkPanels(tab);
        const padding = win.getComputedStyle(el('.page')).paddingLeft;
        pagePadding ??= padding;
        expect(padding).withContext('Matching spacing across story tabs').toBe(pagePadding);
        await snapshot(tab.toLowerCase());
        for (const section of c.detailTabs) {
          c.selectDetailSection(section);
          await render();
          doc.querySelectorAll('details').forEach((d) => (d.open = true));
          checkPanels(tab + ' ' + section);
          expect(el('[role="tab"][aria-selected="true"]').textContent).toContain(section);
          expect(el('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('detail-tab-' + section);
          if (section === 'Variables' && (tab === 'Equipment' || tab === 'Items')) {
            const propertyRow = el('story-properties .variable-row');
            const fields = Array.from(propertyRow.querySelectorAll('label'));
            if (width >= 800) expect(new Set(fields.map((field) => field.getBoundingClientRect().top)).size).toBe(1);
          }
          if (tab === 'Characters' && section === 'Equipment') {
            expect(el('story-character-equipment').textContent).toContain('Starts locked');
            expect(el('story-inventory-editor')).toBeNull();
          }
          if (tab === 'Equipment') {
            expect(el('story-character-equipment')).toBeNull();
            expect(el('story-equipment-editor').textContent).not.toContain('Create copy');
            expect(!!el('story-locks')).toBe(section === 'Locks');
          }
          await snapshot(tab.toLowerCase() + '-' + section.toLowerCase());
          if (tab === 'Equipment' && section === 'Locks') {
            for (const methodSection of ['Attempt', 'Results']) {
              doc.querySelectorAll<HTMLButtonElement>('.method-tabs button').forEach((button) => {
                if (button.textContent.trim() === methodSection) button.click();
              });
              await render();
              doc.querySelectorAll('details').forEach((d) => (d.open = true));
              checkPanels('Unlock method ' + methodSection);
              if (methodSection === 'Results') {
                const columns = Array.from(el('.method-results').children) as HTMLElement[];
                if (width >= 800 && fontSize === 14) expect(columns[0].getBoundingClientRect().top).toBe(columns[1].getBoundingClientRect().top);
                else expect(columns[1].getBoundingClientRect().top).toBeGreaterThan(columns[0].getBoundingClientRect().top);
              }
              const scroll = el('.detail-scroll');
              scroll.scrollTop += el('.unlock-method').getBoundingClientRect().top - scroll.getBoundingClientRect().top;
              await snapshot('equipment-locks-' + methodSection.toLowerCase());
            }
          }
        }
        if (tab === 'Equipment') {
          c.entityId = 'sharp-variant';
          c.selectDetailSection('General');
          await render();
          checkPanels('Equipment');
          await snapshot('equipment-variant');
          c.setEquipmentView('types');
          await render();
          checkWidth('Equipment type');
          expect(el('story-equipment-editor').textContent).not.toContain('Choose type');
          expect(el('.detail-actions').textContent).toContain('Create equipment');
          await snapshot('equipment-type');
          c.selectDetailSection('Effects');
          await render();
          checkPanels('Equipment type effects');
          expect(el('story-equipment-editor app-multiselect')).not.toBeNull();
          await snapshot('equipment-type-effects');
        }
        if (width < 800) {
          el('.back-list').click();
          await render();
          expect(visible(el('.list-panel'))).toBeTrue();
          expect(visible(el('.detail-panel'))).toBeFalse();
          checkWidth(tab + ' list');
        }
      }
      c.setTab('Notes');
      notes.current = notes.articles[1];
      await render();
      checkWidth('Notes');
      const noteText = el('.note-text'),
        noteBody = el('.note-body'),
        noteToolbarTop = el('.detail-toolbar').getBoundingClientRect().top;
      noteBody.scrollTop = noteBody.scrollHeight;
      expect(noteBody.scrollTop).toBeGreaterThan(0);
      expect(noteText.scrollHeight).toBeLessThanOrEqual(noteText.clientHeight + 1);
      expect(el('.detail-toolbar').getBoundingClientRect().top).toBe(noteToolbarTop);
      expect(noteBody.getBoundingClientRect().bottom).toBeLessThanOrEqual(height);
      await snapshot('notes');
      if (width < 800) {
        el('.back-list').click();
        await render();
      }
      const noteList = el('.items-container'),
        noteSearch = el('.sidebar-header');
      const noteSearchTop = noteSearch.getBoundingClientRect().top;
      noteList.scrollTop = noteList.scrollHeight;
      expect(noteList.scrollTop).toBeGreaterThan(0);
      expect(noteSearch.getBoundingClientRect().top).toBe(noteSearchTop);
      checkWidth('Notes list');
      if (width >= 800) expect(el('app-sidebar').getBoundingClientRect().width).toBe(260);
      expect(el('.tree-indent, .placeholder, .root-drop-zone')).toBeNull();
      noteList.scrollTop = 0;
      const firstNote = el('app-sidebar .story-row .title');
      expect(firstNote).not.toBeNull();
      expect(el('app-sidebar .folder-children, app-sidebar-row i, app-sidebar-row [aria-expanded]')).toBeNull();
      expect(doc.querySelectorAll('app-sidebar-row').length).toBe(36);
      await snapshot('notes-list');
      notes.startDrag(notes.articles[1]);
      await render();
      const dropZone = el('.root-drop-zone');
      expect(dropZone.getBoundingClientRect().height).toBeGreaterThan(0);
      expect(dropZone.getBoundingClientRect().bottom).toBeLessThanOrEqual(height);
      const dropTop = dropZone.getBoundingClientRect().top;
      noteList.scrollTop = noteList.scrollHeight;
      expect(dropZone.getBoundingClientRect().top).toBe(dropTop);
      checkWidth('Notes drag target');
      await snapshot('notes-drag');
      notes.clearDrag();
      await render();
      expect(el('.root-drop-zone')).toBeNull();
      c.setTab('Scenes');
      c.showSceneMap();
      await render();
      checkWidth('Map');
      expect(el('svg').getBoundingClientRect().height).toBeGreaterThan(80);
      expect(el('svg').getBoundingClientRect().bottom).toBeLessThanOrEqual(height);
      await snapshot('map');
      c.selectScene(c.story.start);
      await render();
      doc.querySelectorAll('details').forEach((d) => (d.open = true));
      checkPanels('Scene editor');
      await snapshot('scene');
      el('.detail-scroll').scrollTop = el('story-condition').offsetTop;
      await snapshot('scene-logic');
      c.testScene = c.sceneId;
      await render();
      checkWidth('Scene test');
      const testScroll = el('.test-setup');
      expect(testScroll.clientHeight).toBeGreaterThan(80);
      const testToolbarTop = el('.player-toolbar').getBoundingClientRect().top;
      testScroll.scrollTop = testScroll.scrollHeight;
      expect(testScroll.scrollTop).toBeGreaterThan(0);
      expect(el('.player-toolbar').getBoundingClientRect().top).toBe(testToolbarTop);
      testScroll.scrollTop = 0;
      await snapshot('test');
      c.showStorySettings();
      await render();
      checkWidth('Story settings');
      await snapshot('settings');
      el('.detail-scroll').scrollTop = el('story-layers').offsetTop;
      checkWidth('Layer coverage settings');
      expect(el('story-layers input[type=checkbox]')).toBeNull();
      expect(el('story-layers app-multiselect').getBoundingClientRect().width).toBeLessThanOrEqual(360);
      await snapshot('layers');
      const layerRow = el('story-layers .layer-row:last-child');
      const layerSearch = layerRow.querySelector('input');
      const layerScroll = el('.detail-scroll');
      layerScroll.scrollTop += layerRow.getBoundingClientRect().top - layerScroll.getBoundingClientRect().top;
      expect(win.getComputedStyle(layerRow.querySelector('.ng-placeholder')).display).toBe('none');
      checkWidth('Long selected layer chip');
      await snapshot('layers-chips');
      layerSearch.value = 'Body';
      layerSearch.dispatchEvent(new Event('input', { bubbles: true }));
      await render();
      // ng-select v20 appends to the runner document; adopt into this test viewport.
      const dropdown = document.querySelector<HTMLElement>('.ng-dropdown-panel');
      expect(dropdown).not.toBeNull();
      doc.body.append(dropdown);
      checkWidth('Layer multiselect dropdown');
      expect(dropdown.getBoundingClientRect().right).toBeLessThanOrEqual(width);
      expect(dropdown.textContent).toContain('Body');
      await snapshot('layers-dropdown');
      layerSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await render();
      c.setTab('Play');
      await render();
      expect(doc.querySelector('.saved-game')).toBeNull();
      checkWidth('Play');
      expect(win.getComputedStyle(el('.player-content')).overflowY).toBe('hidden');
      expect(win.getComputedStyle(el('.dialogue-history')).overflowY).toBe('auto');
      const navTop = el('nav').getBoundingClientRect().top;
      const switchTop = el('.gear-switch').getBoundingClientRect().top;
      const dialogue = el('.dialogue-history');
      const choices = el('.choices');
      const choicesTop = choices.getBoundingClientRect().top;
      expect(choices.getBoundingClientRect().bottom).toBeLessThanOrEqual(el('.player-content').getBoundingClientRect().bottom);
      expect(choices.getBoundingClientRect().bottom).toBeLessThanOrEqual(height);
      expect(choicesTop).toBeGreaterThan(dialogue.getBoundingClientRect().top);
      dialogue.scrollTop = dialogue.scrollHeight;
      expect(dialogue.scrollTop).toBeGreaterThan(0);
      expect(choices.getBoundingClientRect().top).toBe(choicesTop);
      const savedGame = persistence.data.playthroughs[0];
      const originalTranscript = savedGame.transcript;
      dialogue.scrollTop = 0;
      savedGame.transcript = [...originalTranscript, { ...originalTranscript[0], parts: [{ text: 'The latest dialogue is now visible.' }] }];
      const inventoryScroll = el('.gear-content').scrollTop;
      await render();
      const latest = el('.transcript-entry:last-child').getBoundingClientRect();
      expect(dialogue.scrollTop).toBeGreaterThan(0);
      expect(latest.bottom).toBeLessThanOrEqual(dialogue.getBoundingClientRect().bottom + 1);
      expect(latest.bottom).toBeGreaterThan(dialogue.getBoundingClientRect().top);
      expect(choices.getBoundingClientRect().top).toBe(choicesTop);
      expect(el('.gear-content').scrollTop).toBe(inventoryScroll);
      dialogue.scrollTop = 0;
      await render();
      expect(dialogue.scrollTop).withContext('Reading older dialogue is not interrupted by unrelated renders').toBe(0);
      savedGame.transcript = originalTranscript;
      await render();
      expect(el('nav').getBoundingClientRect().top).toBe(navTop);
      expect(el('.gear-switch').getBoundingClientRect().top).toBe(switchTop);
      expect(el('.inventory-view')).not.toBeNull();
      expect(el('.gear-panel').getBoundingClientRect().right).toBeLessThanOrEqual(width);
      expect(el('.gear-panel').getBoundingClientRect().left).toBeGreaterThanOrEqual(dialogue.getBoundingClientRect().right);
      await snapshot('play');
      const equipmentButton = Array.from(doc.querySelectorAll<HTMLButtonElement>('.gear-switch button')).find((b) => b.textContent === 'Equipment');
      equipmentButton.click();
      await render();
      const equipmentPanel = el('.equipment-view');
      expect(equipmentPanel.querySelector('summary')).toBeNull();
      const action = equipmentPanel.querySelector<HTMLButtonElement>('.gear-action');
      expect(win.getComputedStyle(action).fontSize).toBe(win.getComputedStyle(equipmentButton).fontSize);
      expect(action.getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
      expect(doc.querySelector('.inventory-view')).toBeNull();
      expect(equipmentButton.getAttribute('aria-pressed')).toBe('true');
      expect(equipmentPanel.textContent).toContain('Blocked by');
      expect(Array.from(equipmentPanel.querySelectorAll('button')).some((b) => b.textContent.trim() === 'Unequip' && !b.disabled)).toBeTrue();
      checkWidth('Player equipment actions');
      await snapshot('play-equipment');
      const gearScroll = el('.gear-content');
      const dialogueTop = dialogue.scrollTop;
      gearScroll.scrollTop = gearScroll.scrollHeight;
      if (gearScroll.scrollHeight > gearScroll.clientHeight) expect(gearScroll.scrollTop).toBeGreaterThan(0);
      expect(dialogue.scrollTop).toBe(dialogueTop);
      expect(el('.gear-switch').getBoundingClientRect().top).toBe(switchTop);
      expect(equipmentPanel.textContent).toContain('Locked');
      expect(equipmentPanel.textContent).toContain('Use matching key');
      expect(equipmentPanel.textContent).toContain('Dispel the ancient curse');
      checkWidth('Player unlock methods');
      await snapshot('play-locks');
      expect(JSON.stringify(persistence.data)).toBe(documentBefore);
      expect(notes.articles.map((n) => n.text)).toEqual(notesBefore);
      expect(persistence.save).not.toHaveBeenCalled();
    });
  }
});
