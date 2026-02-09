import { Component, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-image-tournament-longest-chain',
  imports: [],
  templateUrl: './image-tournament-longest-chain.component.html',
  styleUrls: ['./image-tournament-longest-chain.component.scss']
})
export class ImageTournamentLongestChainComponent {
  protected longestChain: GalleryImage[] = [];

  constructor(
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.stateService.tournament.comparison();
      this.refresh();
    });
  }

  private refresh(): void {
    this.longestChain = this.getLongestChain(this.stateService.tournament.comparisons ?? []);
  }

  protected openFullscreen(image: GalleryImage): void {
    if (!image) return;
    this.stateService.fullscreenImage.set(image);
  }

  private getLongestChain(comparisons: [GalleryImage, GalleryImage][]): GalleryImage[] {
    if (!comparisons.length) {
      return [];
    }

    const adjacency = new Map<string, Set<string>>();
    const imageById = new Map<string, GalleryImage>();
    const nodesInOrder: string[] = [];

    const ensureNode = (imageId: string): void => {
      if (adjacency.has(imageId)) {
        return;
      }
      adjacency.set(imageId, new Set<string>());
      nodesInOrder.push(imageId);
    };

    for (const [winner, loser] of comparisons) {
      if (!winner || !loser) {
        continue;
      }
      imageById.set(winner.id, winner);
      imageById.set(loser.id, loser);
      ensureNode(winner.id);
      ensureNode(loser.id);
      adjacency.get(winner.id).add(loser.id);
    }

    const memoizedPaths = new Map<string, string[]>();
    const visiting = new Set<string>();

    const collectBestPath = (startId: string): string[] => {
      const cached = memoizedPaths.get(startId);
      if (cached) {
        return cached;
      }

      if (visiting.has(startId)) {
        return [];
      }

      visiting.add(startId);
      let bestTail: string[] = [];

      for (const neighborId of adjacency.get(startId) ?? []) {
        const candidateTail = collectBestPath(neighborId);
        if (candidateTail.length > bestTail.length) {
          bestTail = candidateTail;
        }
      }

      visiting.delete(startId);
      const bestPath = [startId, ...bestTail];
      memoizedPaths.set(startId, bestPath);
      return bestPath;
    };

    let longestIds: string[] = [];
    for (const imageId of nodesInOrder) {
      const candidate = collectBestPath(imageId);
      if (candidate.length > longestIds.length) {
        longestIds = candidate;
      }
    }

    return longestIds.map(id => imageById.get(id)).filter(image => !!image);
  }
}
