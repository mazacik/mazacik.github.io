import { Injector, signal } from '@angular/core';
import { copy } from '../models/story.model';
import { Data } from '../models/data.interface';
import { storyFixture } from '../engine/story-fixture';
import { choose, startGame } from '../engine/story-engine';
import { StoryManagerSerializationService } from './story-manager-serialization.service';
import { StoryRecovery, Recovery } from './story-recovery';

describe('Story saving and recovery', () => {
  let cloud: Data, pending: Recovery, backup: Data, notes: any, application: any, drive: any, scope: string;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 15));
  beforeEach(() => {
    scope = 'account:document';
    cloud = {
      version: 4,
      articles: [
        { id: 'story', title: 'My story', text: '', childIds: ['note'], folder: true },
        { id: 'note', title: 'Idea', text: 'Preserve this', childIds: [], folder: false },
      ],
      stories: [storyFixture()],
      playthroughs: [],
    };
    pending = undefined;
    backup = undefined;
    notes = {};
    application = { loading: signal(false), changes: signal(false), errors: signal(false) };
    drive = {
      request: jasmine.createSpy().and.callFake(async () => copy(cloud)),
      recoveryScope: jasmine.createSpy().and.callFake(async () => scope),
      update: jasmine.createSpy().and.callFake(async (data: Data) => {
        cloud = copy(data);
      }),
    };
    spyOn(StoryRecovery.prototype, 'read').and.callFake(async () => (pending ? copy(pending) : undefined));
    spyOn(StoryRecovery.prototype, 'write').and.callFake(async (value) => {
      pending = copy(value);
    });
    spyOn(StoryRecovery.prototype, 'clear').and.callFake(async () => {
      pending = undefined;
    });
    spyOn(StoryRecovery.prototype, 'backup').and.callFake(async (value) => {
      if (!backup) backup = copy(value);
    });
  });
  const create = (notes: any, application: any, drive: any) => new StoryManagerSerializationService({ get: () => notes } as unknown as Injector, application, drive);

  it('does not write on load or navigation without edits', async () => {
    const service = create(notes, application, drive);
    await service.loaded;
    service.flush();
    await settle();
    expect(service.ready).toBeTrue();
    expect(drive.update).not.toHaveBeenCalled();
    expect(backup).toBeUndefined();
  });
  it('loads loose notes into a story and persists their assignment on the next save with an original backup', async () => {
    cloud.articles.push({ id: 'loose', title: 'Old note', text: 'Preserve every word', folder: false, childIds: [] });
    const original = copy(cloud),
      service = create(notes, application, drive);
    await service.loaded;
    const recovered = notes.articles.find((a) => a.id === 'loose').parent;
    expect(recovered.title).toBe('Recovered notes');
    expect(service.data.stories.some((s) => s.id === recovered.id)).toBeTrue();
    expect(drive.update).not.toHaveBeenCalled();
    service.save(true);
    await settle();
    expect(backup).toEqual(original);
    expect(cloud.articles.find((a) => a.id === recovered.id).childIds).toEqual(['loose']);
    expect(cloud.articles.find((a) => a.id === 'loose').text).toBe('Preserve every word');
    const reloadedNotes: any = {},
      reloaded = create(reloadedNotes, application, drive);
    await reloaded.loaded;
    expect(reloadedNotes.articles.find((a) => a.id === 'loose').parent.id).toBe(recovered.id);
    expect(reloaded.data.stories.length).toBe(service.data.stories.length);
  });
  it('backs up the original and checkpoints the result before showing it or uploading', async () => {
    let release: () => void;
    drive.update.and.callFake(() => new Promise<void>((resolve) => (release = resolve)));
    const original = copy(cloud),
      service = create(notes, application, drive);
    await service.loaded;
    const game = startGame(service.data.stories[0], 'Test');
    await service.commit(game);
    expect(backup).toEqual(original);
    expect(pending.data.playthroughs[0]).toEqual(game);
    expect(service.data.playthroughs[0]).toEqual(game);
    expect(application.changes()).toBeTrue();
    release();
    await settle();
  });
  it('retains failed random results and resumes without another random draw', async () => {
    const service = create(notes, application, drive);
    await service.loaded;
    const story = service.data.stories[0];
    drive.update.and.rejectWith(new Error('Offline'));
    const game = choose(story, startGame(story, 'Test'), story.scenes[0].passages[0].choices[0].id, () => 0.75);
    await service.commit(game);
    await settle();
    expect(service.error).toContain('Offline');
    expect(pending.data.playthroughs[0].scene).toBe(story.scenes[1].id);
    const reloaded = create({}, application, drive);
    await reloaded.loaded;
    expect(reloaded.data.playthroughs[0]).toEqual(game);
    await settle();
    expect(pending.data.articles).toEqual(cloud.articles);
  });
  it('serializes overlapping author saves and retains the newest note text', async () => {
    let release: () => void;
    const firstUpload = new Promise<void>((resolve) => (release = resolve));
    let uploads = 0;
    drive.update.and.callFake(async (data: Data) => {
      uploads++;
      if (uploads === 1) await firstUpload;
      cloud = copy(data);
    });
    const service = create(notes, application, drive);
    await service.loaded;
    notes.articles[1].text = 'First';
    service.save(true);
    await settle();
    notes.articles[1].text = 'Second';
    service.save(true);
    await settle();
    expect(uploads).toBe(1);
    release();
    await settle();
    await settle();
    expect(uploads).toBe(2);
    expect(cloud.articles[1].text).toBe('Second');
    expect(application.changes()).toBeFalse();
  });
  it('refuses to overwrite invalid downloads or conflicting local changes', async () => {
    cloud.articles[0].childIds = ['missing'];
    const invalid = create(notes, application, drive);
    await invalid.loaded;
    invalid.save(true);
    expect(invalid.ready).toBeFalse();
    expect(drive.update).not.toHaveBeenCalled();
    cloud.articles[0].childIds = ['note'];
    pending = { base: 'older document', data: copy(cloud) };
    const conflict = create(notes, application, drive);
    await conflict.loaded;
    expect(conflict.ready).toBeFalse();
    expect(conflict.recoveryConflict).toEqual(pending);
    expect(drive.update).not.toHaveBeenCalled();
  });
  it('does not expose a transition when local checkpoint storage fails', async () => {
    const service = create(notes, application, drive);
    await service.loaded;
    (StoryRecovery.prototype.write as jasmine.Spy).and.rejectWith(new Error('Storage full'));
    await expectAsync(service.commit(startGame(service.data.stories[0], 'Test'))).toBeRejected();
    expect(service.data.playthroughs).toEqual([]);
    expect(drive.update).not.toHaveBeenCalled();
  });
});
