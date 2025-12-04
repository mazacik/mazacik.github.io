import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ArrayUtils } from '../utils/array.utils';
import { RandomUtils } from '../utils/random.utils';

export interface TournamentState {
  comparisons: [string, string][];
}

export class Tournament {

  private images: GalleryImage[] = [];
  private graph = new Map<GalleryImage, GalleryImage[]>();

  public comparisons: [GalleryImage, GalleryImage][] = [];
  private availableComparisonsCount: number | null = null;

  public start(images: GalleryImage[], state: TournamentState): void {
    this.images = images;
    ArrayUtils.shuffle(this.images);

    const imageMap: { [id: string]: GalleryImage } = {};
    for (const image of this.images) {
      this.graph.set(image, []);
      imageMap[image.id] = image;
    }

    if (state) {
      const imageIds = this.images.map(image => image.id);
      this.comparisons = state.comparisons.filter(([winnerId, loserId]) => imageIds.includes(winnerId) && imageIds.includes(loserId)).map(([winnerId, loserId]) => [imageMap[winnerId], imageMap[loserId]]);
      this.comparisons.forEach(([winner, loser]) => this.handleUserInput(winner, loser));
    }

    this.availableComparisonsCount = null;
  }

  public getNextComparison(): [GalleryImage, GalleryImage] {
    const available: [GalleryImage, GalleryImage][] = this.collectAvailableComparisons();

    if (available.length === 0) return null;
    const [x, y] = available[Math.floor(Math.random() * available.length)];
    return RandomUtils.boolean() ? [x, y] : [y, x];
  }

  public getComparisonProgress(): { total: number; remaining: number; completed: number } {
    if (this.availableComparisonsCount === null) {
      this.collectAvailableComparisons();
    }

    const completed: number = this.comparisons.length;
    const remaining: number = this.availableComparisonsCount ?? 0;

    return {
      completed: completed,
      remaining: remaining,
      total: completed + remaining
    };
  }

  private collectAvailableComparisons(): [GalleryImage, GalleryImage][] {
    const available: [GalleryImage, GalleryImage][] = [];
    const queue = this.images;

    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const a = queue[i];
        const b = queue[j];
        if (!this.hasPath(a, b) && !this.hasPath(b, a)) available.push([a, b]);
      }
    }

    this.availableComparisonsCount = available.length;
    return available;
  }

  private hasPath(from: GalleryImage, to: GalleryImage, collector: string[] = []): boolean {
    if (from === to) return true;

    collector.push(from.id);

    for (const next of this.graph.get(from)) {
      if (!collector.includes(next.id) && this.hasPath(next, to, collector)) {
        return true;
      }
    }

    return false;
  }

  public handleUserInput(winner: GalleryImage, loser: GalleryImage): void {
    if (winner === loser) return;

    ArrayUtils.push(this.graph.get(winner), loser);
    this.comparisons.push([winner, loser]);

    this.updateTransitiveRelations(winner, loser);
    this.availableComparisonsCount = null;
  }

  private updateTransitiveRelations(winner: GalleryImage, loser: GalleryImage): void {
    // Anything loser beats should also be beaten by winner
    for (const subLoser of this.graph.get(loser)) {
      ArrayUtils.push(this.graph.get(winner), subLoser);
    }

    // Anything that beats winner should now also beat loser
    for (const [, edges] of this.graph.entries()) {
      if (edges.includes(winner)) {
        ArrayUtils.push(edges, loser);
      }
    }
  }

  public getRanking(): GalleryImage[] {
    const indegree = new Map<GalleryImage, number>();
    this.images.forEach(image => indegree.set(image, 0));

    // Count incoming edges
    for (const [, losers] of this.graph.entries()) {
      for (const loser of losers) {
        indegree.set(loser, (indegree.get(loser)) + 1);
      }
    }

    // Kahn's algorithm
    const queue: GalleryImage[] = this.images.filter(image => (indegree.get(image) ?? 0) === 0);
    const order: GalleryImage[] = [];

    while (queue.length) {
      const current = queue.shift();
      order.push(current);
      for (const neighbor of this.graph.get(current)) {
        indegree.set(neighbor, indegree.get(neighbor) - 1);
        if (indegree.get(neighbor) === 0) queue.push(neighbor);
      }
    }

    return order;
  }

  public undo(): [GalleryImage, GalleryImage] {
    if (ArrayUtils.isEmpty(this.comparisons)) return null;
    const comparison = this.comparisons.pop();

    this.graph = new Map<GalleryImage, GalleryImage[]>();
    this.images.forEach(image => this.graph.set(image, []));

    for (const [winner, loser] of this.comparisons) {
      ArrayUtils.push(this.graph.get(winner), loser);
      this.updateTransitiveRelations(winner, loser);
    }

    this.availableComparisonsCount = null;
    return comparison;
  }

  public getState(): TournamentState {
    return {
      comparisons: this.comparisons.map(([winner, loser]) => [winner.id, loser.id])
    };
  }

}
