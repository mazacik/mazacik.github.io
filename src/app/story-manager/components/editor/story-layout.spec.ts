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
import { newFlag, newScene } from '../../models/story.model';
import { SceneMapComponent } from './scene-map.component';

// An iframe gives each case its real CSS viewport, including media queries. Copy
// the test runner's global and Angular styles, so global form resets are covered.
describe('Story panel layout with application styles', () => {
  let fixture: ComponentFixture<StoryManagerComponent>, frame: HTMLIFrameElement;
  let notes: StoryManagerStateService, persistence: any;
  const longName = 'The keeper of the northern gate ' + 'UnbrokenName'.repeat(6);

  beforeEach(async () => {
    const story = storyFixture();
    for (let i = 0; i < 35; i++) {
      const scene = newScene();
      scene.title = longName;
      story.scenes.push(scene);
      story.flags.push({ ...newFlag(), name: longName });
    }
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
          navTop = el('nav').getBoundingClientRect().top;
        scroll.scrollTop = scroll.scrollHeight;
        expect(toolbar.getBoundingClientRect().top).toBe(top);
        expect(el('nav').getBoundingClientRect().top).toBe(navTop);
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
      expect(card.querySelectorAll('.story-counts > span').length).toBe(3);
      expect(win.getComputedStyle(title).textDecorationLine).toBe('none');
      const cardStyle = win.getComputedStyle(card);
      expect(title.getBoundingClientRect().top - card.getBoundingClientRect().top).toBeCloseTo(parseFloat(cardStyle.paddingTop) + parseFloat(cardStyle.borderTopWidth), 1);
      await snapshot('library');
      c.open(notes.articles[0]);
      const documentBefore = JSON.stringify(persistence.data),
        notesBefore = notes.articles.map((n) => n.text);
      c.setTab('Variables');
      c.flagId = c.story.flags[0].id;
      await render();
      checkPanels('Variables');
      await snapshot('variables');
      if (width < 800) {
        el('.back-list').click();
        await render();
        expect(visible(el('.list-panel'))).toBeTrue();
        expect(visible(el('.detail-panel'))).toBeFalse();
        checkWidth('Variables list');
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
      doc.querySelectorAll('.test-setup details').forEach((detail: HTMLDetailsElement) => (detail.open = true));
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
      c.setTab('Play');
      await render();
      expect(doc.querySelector('.saved-game')).toBeNull();
      checkWidth('Play');
      expect(win.getComputedStyle(el('.player-content')).overflowY).toBe('hidden');
      expect(win.getComputedStyle(el('.dialogue-history')).overflowY).toBe('auto');
      const navTop = el('nav').getBoundingClientRect().top;
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
      await render();
      const latest = el('.transcript-entry:last-child').getBoundingClientRect();
      expect(dialogue.scrollTop).toBeGreaterThan(0);
      expect(latest.bottom).toBeLessThanOrEqual(dialogue.getBoundingClientRect().bottom + 1);
      expect(latest.bottom).toBeGreaterThan(dialogue.getBoundingClientRect().top);
      expect(choices.getBoundingClientRect().top).toBe(choicesTop);
      dialogue.scrollTop = 0;
      await render();
      expect(dialogue.scrollTop).withContext('Reading older dialogue is not interrupted by unrelated renders').toBe(0);
      savedGame.transcript = originalTranscript;
      await render();
      expect(el('nav').getBoundingClientRect().top).toBe(navTop);
      expect(el('.gear-panel')).toBeNull();
      await snapshot('play');
      expect(JSON.stringify(persistence.data)).toBe(documentBefore);
      expect(notes.articles.map((n) => n.text)).toEqual(notesBefore);
      expect(persistence.save).not.toHaveBeenCalled();
    });
  }
});
