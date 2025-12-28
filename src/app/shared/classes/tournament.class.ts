import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ArrayUtils } from '../utils/array.utils';
import { RandomUtils } from '../utils/random.utils';

export interface TournamentState {
  comparisons: [string, string][];
}

export class Tournament {

  // TODO performance improvement: consider bitset-based sets to reduce memory/GC pressure

  private images: GalleryImage[];
  private imagesToCompare: GalleryImage[];
  private graph = new Map<GalleryImage, Set<GalleryImage>>();
  private availableComparisons: [GalleryImage, GalleryImage][];
  private availableKeyToIndex: Map<string, number>;

  public comparisons: [GalleryImage, GalleryImage][];
  private availableComparisonsCount: number | null = null;

  public start(images: GalleryImage[], imagesToCompare: GalleryImage[], state: TournamentState): void {
    this.comparisons = [];
    this.availableComparisons = [];
    this.availableKeyToIndex = new Map<string, number>();
    this.availableComparisonsCount = null;
    this.graph = new Map<GalleryImage, Set<GalleryImage>>();

    this.images = images ?? [];
    this.imagesToCompare = imagesToCompare ?? [];
    ArrayUtils.shuffle(this.imagesToCompare);

    const imageMap: { [id: string]: GalleryImage } = {};
    for (const image of this.images) {
      this.graph.set(image, new Set<GalleryImage>());
      imageMap[image.id] = image;
    }

    if (state) {
      const imageIds = this.images.map(image => image.id);
      state.comparisons.filter(([winnerId, loserId]) => imageIds.includes(winnerId) && imageIds.includes(loserId)).map(([winnerId, loserId]) => [imageMap[winnerId], imageMap[loserId]]).forEach(([winner, loser]) => this.handleUserInput(winner, loser));
    }

    this.rebuildAvailableComparisons();
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
    if (this.availableComparisonsCount === null) {
      this.rebuildAvailableComparisons();
    }

    return this.availableComparisons;
  }

  private hasPath(from: GalleryImage, to: GalleryImage): boolean {
    return this.graph.get(from)?.has(to) ?? false;
  }

  public handleUserInput(winner: GalleryImage, loser: GalleryImage): void {
    if (winner === loser) return;

    this.graph.get(winner).add(loser);
    this.comparisons.push([winner, loser]);

    this.updateTransitiveRelations(winner, loser);
  }

  private updateTransitiveRelations(winner: GalleryImage, loser: GalleryImage): void {
    const successors = new Set<GalleryImage>(this.graph.get(loser));
    successors.add(loser);

    const predecessors: GalleryImage[] = [];
    for (const [node, edges] of this.graph.entries()) {
      if (node === winner || edges.has(winner)) {
        predecessors.push(node);
      }
    }

    for (const predecessor of predecessors) {
      const edges = this.graph.get(predecessor);
      for (const successor of successors) {
        edges.add(successor);
      }
    }

    this.pruneAvailableComparisons(predecessors, successors);
  }

  private pruneAvailableComparisons(predecessors: Iterable<GalleryImage>, successors: Iterable<GalleryImage>): void {
    for (const predecessor of predecessors) {
      for (const successor of successors) {
        this.removeAvailablePair(predecessor, successor);
      }
    }
    this.availableComparisonsCount = this.availableComparisons.length;
  }

  public getRanking(): GalleryImage[] {
    const indegree = new Map<GalleryImage, number>();
    this.imagesToCompare.forEach(image => indegree.set(image, 0));

    // Count incoming edges
    for (const [, losers] of this.graph.entries()) {
      for (const loser of losers) {
        if (!indegree.has(loser)) continue;
        indegree.set(loser, (indegree.get(loser) ?? 0) + 1);
      }
    }

    // Kahn's algorithm
    const queue: GalleryImage[] = this.imagesToCompare.filter(image => (indegree.get(image) ?? 0) === 0);
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

  public getNextBestBeatenImages(image: GalleryImage, limit: number = 3): GalleryImage[] {
    if (!image || limit <= 0) return [];

    const beatenImages = this.graph.get(image);
    if (!beatenImages || beatenImages.size === 0) return [];

    const ranking = this.getRanking();
    const startIndex = ranking.indexOf(image);
    if (startIndex === -1) return [];

    const result: GalleryImage[] = [];
    for (let i = startIndex + 1; i < ranking.length && result.length < limit; i++) {
      const candidate = ranking[i];
      if (beatenImages.has(candidate)) result.push(candidate);
    }

    return result;
  }

  public undo(): [GalleryImage, GalleryImage] {
    if (ArrayUtils.isEmpty(this.comparisons)) return null;
    const comparison = this.comparisons.pop();

    this.graph = new Map<GalleryImage, Set<GalleryImage>>();
    this.images.forEach(image => this.graph.set(image, new Set<GalleryImage>()));
    this.availableComparisons = [];
    this.availableKeyToIndex = new Map<string, number>();

    for (const [winner, loser] of this.comparisons) {
      this.graph.get(winner).add(loser);
      this.updateTransitiveRelations(winner, loser);
    }

    this.rebuildAvailableComparisons();
    return comparison;
  }

  public getState(): TournamentState {
    return {
      comparisons: this.comparisons.map(([winner, loser]) => [winner.id, loser.id])
    };
  }

  private rebuildAvailableComparisons(): void {
    this.availableComparisons = [];
    this.availableKeyToIndex = new Map<string, number>();

    for (let i = 0; i < this.imagesToCompare.length; i++) {
      for (let j = i + 1; j < this.imagesToCompare.length; j++) {
        const a = this.imagesToCompare[i];
        const b = this.imagesToCompare[j];
        if (!this.hasPath(a, b) && !this.hasPath(b, a)) this.addAvailablePair(a, b);
      }
    }

    console.log(this.availableComparisons);

    this.availableComparisonsCount = this.availableComparisons.length;
  }

  private addAvailablePair(a: GalleryImage, b: GalleryImage): void {
    const key = this.makePairKey(a, b);
    if (this.availableKeyToIndex.has(key)) return;
    this.availableKeyToIndex.set(key, this.availableComparisons.length);
    this.availableComparisons.push([a, b]);
  }

  private removeAvailablePair(a: GalleryImage, b: GalleryImage): void {
    const key = this.makePairKey(a, b);
    const index = this.availableKeyToIndex.get(key);
    if (index === undefined) return;

    const lastIndex = this.availableComparisons.length - 1;
    if (lastIndex > -1) {
      if (index !== lastIndex) {
        const lastPair = this.availableComparisons[lastIndex];
        this.availableComparisons[index] = lastPair;
        this.availableKeyToIndex.set(this.makePairKey(lastPair[0], lastPair[1]), index);
      }
      this.availableComparisons.pop();
    }

    this.availableKeyToIndex.delete(key);
  }

  private makePairKey(a: GalleryImage, b: GalleryImage): string {
    const [first, second] = [a.id, b.id].sort();
    return `${first}|${second}`;
  }

}
