import { Injectable, Injector } from '@angular/core';
import { ApplicationService } from '../../shared/services/application.service';
import { Data } from '../models/data.interface';
import { copy, Playthrough, uid } from '../models/story.model';
import { StoryManagerGoogleDriveService } from './story-manager-google-drive.service';
import { StoryManagerStateService } from './story-manager-state.service';
import { parseDocument, serializeArticles } from './story-document';
import { Recovery, StoryRecovery } from './story-recovery';
import { DialogService } from '../../shared/services/dialog.service';

@Injectable({ providedIn: 'root' })
export class StoryManagerSerializationService {
  public ready = false;
  public error = '';
  public data: Data;
  public committing = false;
  public readonly loaded: Promise<void>;
  public recoveryConflict: Recovery;
  private recovery: StoryRecovery;
  private base = '';
  private timer: ReturnType<typeof setTimeout>;
  private queue: Promise<unknown> = Promise.resolve();
  private original: Data;
  private pending = false;
  private changeVersion = 0;
  private scheduled = false;
  constructor(
    private injector: Injector,
    private application: ApplicationService,
    private drive: StoryManagerGoogleDriveService,
  ) {
    this.application.loading.set(true);
    this.loaded = this.load();
  }
  private async load(): Promise<void> {
    try {
      const [download, scope] = await Promise.all([this.drive.request(), this.drive.recoveryScope()]);
      parseDocument(download);
      this.original = copy(download);
      this.base = JSON.stringify(download);
      this.recovery = new StoryRecovery(scope);
      const pending = await this.recovery.read();
      let source = download;
      if (pending) {
        if (pending.base === this.base || (pending.data.saveId && pending.data.saveId === download.saveId)) {
          source = pending.data;
          this.pending = true;
        } else {
          this.recoveryConflict = pending;
          throw new Error('A local recovery copy conflicts with the Drive document. Download the local copy before choosing which document to keep.');
        }
      }
      const parsed = parseDocument(source);
      this.data = parsed.data;
      this.data.playthroughs.forEach((game) => {
        if (game.status === 'active' && this.data.stories.find((s) => s.id === game.storyId)?.revision !== game.revision) game.status = 'canceled';
      });
      this.injector.get(StoryManagerStateService).articles = parsed.articles;
      this.ready = true;
      if (this.pending) this.save(true);
    } catch (error) {
      this.fail(error);
    } finally {
      this.application.loading.set(false);
    }
  }
  private fail(error: unknown): void {
    this.error = error instanceof Error ? error.message : 'Story saving failed. Please retry.';
    this.application.errors.set(true);
    this.application.changes.set(this.pending);
  }
  private snapshot(game?: Playthrough): Data {
    const games = this.data.playthroughs.filter((p) => p.id !== game?.id);
    if (game) games.push(game);
    return copy({ ...this.data, version: 4, saveId: uid(), articles: serializeArticles(this.injector.get(StoryManagerStateService).articles), playthroughs: game ? games : this.data.playthroughs });
  }
  public save(instant = false): void {
    if (!this.ready) return;
    clearTimeout(this.timer);
    const version = ++this.changeVersion;
    this.scheduled = true;
    this.pending = true;
    this.application.changes.set(true);
    this.timer = setTimeout(
      () => {
        const snapshot = this.snapshot();
        this.scheduled = false;
        this.queue = this.queue
          .catch(() => undefined)
          .then(async () => {
            await this.recovery.backup(this.original);
            await this.recovery.write({ base: this.base, data: snapshot });
            await this.upload(snapshot, version);
          })
          .catch((e) => this.fail(e));
      },
      instant ? 0 : 700,
    );
  }
  private async upload(snapshot: Data, version: number): Promise<void> {
    await this.drive.update(snapshot);
    this.base = JSON.stringify(snapshot);
    this.data.saveId = snapshot.saveId;
    await this.recovery.clear();
    this.pending = version !== this.changeVersion;
    this.error = '';
    this.application.errors.set(false);
    this.application.changes.set(this.pending);
  }
  public async commit(game: Playthrough): Promise<void> {
    if (this.committing) throw new Error('A choice is already being saved.');
    this.committing = true;
    clearTimeout(this.timer);
    this.scheduled = false;
    const version = ++this.changeVersion;
    let snapshot: Data;
    const checkpoint = this.queue
      .catch(() => undefined)
      .then(async () => {
        if (this.data.stories.find((s) => s.id === game.storyId)?.revision !== game.revision) throw new Error('The story changed while saving. Start a new game.');
        snapshot = this.snapshot(game);
        await this.recovery.backup(this.original);
        await this.recovery.write({ base: this.base, data: snapshot });
        this.data.playthroughs = snapshot.playthroughs;
        this.pending = true;
        this.application.changes.set(true);
      });
    this.queue = checkpoint.then(() => this.upload(snapshot, version)).catch((e) => this.fail(e));
    try {
      await checkpoint;
    } finally {
      this.committing = false;
    }
  }
  public flush(): void {
    if (this.scheduled) this.save(true);
  }
  public downloadRecovery(): void {
    const data = this.recoveryConflict?.data;
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'story-manager-local-recovery.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  public async useDriveCopy(): Promise<void> {
    if (!this.recoveryConflict) return;
    const confirmed = await this.injector.get(DialogService).createConfirmation({
      title: 'Use Drive document',
      messages: ['Download the local recovery copy first if you need to keep its unsynced changes.', 'Discard the local pending copy and use the current Drive document?'],
    });
    if (confirmed) {
      await this.recovery.clear();
      location.reload();
    }
  }
  public retry(): void {
    if (this.ready) this.save(true);
    else location.reload();
  }
}
