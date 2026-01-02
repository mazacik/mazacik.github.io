import { Component } from '@angular/core';
import { GalleryImage } from '../../models/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-comparison-path',
  imports: [],
  templateUrl: './comparison-path.component.html',
  styleUrls: ['./comparison-path.component.scss']
})
export class ComparisonPathComponent {

  protected leftSelection: GalleryImage;
  protected rightSelection: GalleryImage;
  protected comparisonPath: [GalleryImage, GalleryImage][] = [];
  protected allComparisons: [GalleryImage, GalleryImage][] = [];
  private imageById = new Map<string, GalleryImage>();

  constructor(
    protected stateService: GalleryStateService
  ) {
    this.buildImageMap();
    this.buildAllComparisons();
  }

  protected selectLeft(image: GalleryImage): void {
    this.leftSelection = this.leftSelection === image ? null : image;
    this.updatePath();
  }

  protected selectRight(image: GalleryImage): void {
    this.rightSelection = this.rightSelection === image ? null : image;
    this.updatePath();
  }

  protected clearSelections(): void {
    this.leftSelection = null;
    this.rightSelection = null;
    this.updatePath();
  }

  private updatePath(): void {
    this.comparisonPath = [];
    if (!this.leftSelection || !this.rightSelection) return;
    if (this.leftSelection === this.rightSelection) return;

    const path = this.findPathIds(this.leftSelection.id, this.rightSelection.id);
    if (!path) return;

    this.ensureImageMap();

    for (let i = 0; i < path.length - 1; i++) {
      const winner = this.imageById.get(path[i]);
      const loser = this.imageById.get(path[i + 1]);
      if (winner && loser) {
        this.comparisonPath.push([winner, loser]);
      }
    }
  }

  private buildAllComparisons(): void {
    this.allComparisons = [];
    const comparisons = this.stateService.tournamentState?.comparisons ?? [];
    if (comparisons.length === 0) return;
    this.ensureImageMap();

    for (const [winnerId, loserId] of comparisons) {
      const winner = this.imageById.get(winnerId);
      const loser = this.imageById.get(loserId);
      if (winner && loser) {
        this.allComparisons.push([winner, loser]);
      }
    }
  }

  private buildImageMap(): void {
    this.imageById.clear();
    for (const image of this.stateService.images) {
      this.imageById.set(image.id, image);
    }
  }

  private ensureImageMap(): void {
    if (this.imageById.size === 0) {
      this.buildImageMap();
    }
  }

  private findPathIds(startId: string, endId: string): string[] | null {
    const comparisons = this.stateService.tournamentState?.comparisons ?? [];
    if (comparisons.length === 0) return null;

    const adjacency = new Map<string, string[]>();
    for (const [winnerId, loserId] of comparisons) {
      const targets = adjacency.get(winnerId);
      if (targets) {
        targets.push(loserId);
      } else {
        adjacency.set(winnerId, [loserId]);
      }
    }

    const queue: string[] = [startId];
    const visited = new Set<string>([startId]);
    const parent = new Map<string, string>();

    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (current === endId) break;

      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        parent.set(next, current);
        queue.push(next);
      }
    }

    if (!visited.has(endId)) return null;

    const path: string[] = [];
    let current: string = endId;
    while (current) {
      path.unshift(current);
      if (current === startId) break;
      current = parent.get(current);
    }

    if (path[0] !== startId) return null;
    return path;
  }

}
