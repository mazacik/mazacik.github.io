import { Component, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { GalleryImage } from '../../models/gallery-image.class';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-comparison-path',
  imports: [],
  templateUrl: './comparison-path.component.html',
  styleUrls: ['./comparison-path.component.scss']
})
export class ComparisonPathComponent extends DialogContentBase<void, { start: GalleryImage; end: GalleryImage; }> implements OnInit {

  public override inputs: { start: GalleryImage; end: GalleryImage; };

  public configuration: DialogContainerConfiguration = {
    title: () => 'Comparison Path',
    headerButtons: [{
      iconClass: 'fa-solid fa-times',
      click: () => this.close()
    }],
    footerButtons: [{
      text: () => this.hasPendingChanges ? 'Save' : 'Close',
      click: () => this.saveOrClose()
    }],
    allowMultiple: true
  };

  protected path: GalleryImage[] = [];
  protected pendingRemovals = new Set<string>();

  constructor(
    protected stateService: GalleryStateService,
    private serializationService: GallerySerializationService
  ) {
    super();
  }

  ngOnInit(): void {
    this.buildPath();
  }

  public close(): void {
    this.resolve();
  }

  protected toggleRemoval(index: number): void {
    if (!this.path || index < 0 || index >= this.path.length - 1) return;
    const winnerId = this.path[index].id;
    const loserId = this.path[index + 1].id;
    const key = this.makeEdgeKey(winnerId, loserId);
    if (this.pendingRemovals.has(key)) {
      this.pendingRemovals.delete(key);
    } else {
      this.pendingRemovals.add(key);
    }
  }

  protected isRemovalPending(index: number): boolean {
    if (!this.path || index < 0 || index >= this.path.length - 1) return false;
    const winnerId = this.path[index].id;
    const loserId = this.path[index + 1].id;
    return this.pendingRemovals.has(this.makeEdgeKey(winnerId, loserId));
  }

  protected get hasPendingChanges(): boolean {
    return this.pendingRemovals.size > 0;
  }

  private saveOrClose(): void {
    if (!this.hasPendingChanges) {
      this.close();
      return;
    }

    const currentComparison = this.stateService.tournament?.comparison;
    const currentIds = currentComparison ? [currentComparison[0]?.id, currentComparison[1]?.id] : null;

    const comparisons = this.stateService.tournamentState?.comparisons ?? [];
    if (comparisons.length) {
      const updatedComparisons = comparisons.filter(([winnerId, loserId]) => !this.pendingRemovals.has(this.makeEdgeKey(winnerId, loserId)));
      this.stateService.tournamentState = { comparisons: updatedComparisons };
      this.serializationService.save();

      const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
      const imagesToCompare = this.stateService.tournament?.getRanking?.() ?? [];
      this.stateService.tournament.start(images, imagesToCompare.length ? imagesToCompare : images, this.stateService.tournamentState);

      if (currentIds?.[0] && currentIds?.[1]) {
        const imageById = new Map<string, GalleryImage>();
        for (const image of images) {
          imageById.set(image.id, image);
        }
        const left = imageById.get(currentIds[0]);
        const right = imageById.get(currentIds[1]);
        if (left && right) {
          this.stateService.tournament.comparison = [left, right];
        }
      }
    }

    this.close();
  }

  private buildPath(): void {
    this.path = [];
    const start = this.inputs?.start;
    const end = this.inputs?.end;
    if (!start || !end) return;
    if (start.id === end.id) {
      this.path = [start];
      return;
    }

    const comparisons = this.stateService.tournamentState?.comparisons ?? [];
    if (comparisons.length === 0) return;

    const adjacency = new Map<string, string[]>();
    for (const [winnerId, loserId] of comparisons) {
      const targets = adjacency.get(winnerId);
      if (targets) {
        targets.push(loserId);
      } else {
        adjacency.set(winnerId, [loserId]);
      }
    }

    const queue: string[] = [start.id];
    const visited = new Set<string>([start.id]);
    const parent = new Map<string, string>();

    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (current === end.id) break;

      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        parent.set(next, current);
        queue.push(next);
      }
    }

    if (!visited.has(end.id)) return;

    const pathIds: string[] = [];
    let current: string = end.id;
    while (current) {
      pathIds.unshift(current);
      if (current === start.id) break;
      current = parent.get(current);
    }

    if (pathIds[0] !== start.id) return;

    const imageById = new Map<string, GalleryImage>();
    for (const image of this.stateService.images) {
      imageById.set(image.id, image);
    }
    imageById.set(start.id, start);
    imageById.set(end.id, end);

    this.path = pathIds.map(id => imageById.get(id)).filter(Boolean);
  }

  private makeEdgeKey(winnerId: string, loserId: string): string {
    return `${winnerId}|${loserId}`;
  }

}
