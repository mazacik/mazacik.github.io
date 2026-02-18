import { signal, WritableSignal } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ArrayUtils } from '../utils/array.utils';
import { RandomUtils } from '../utils/random.utils';

export interface TournamentState {
  comparisons: [string, string][];
}

interface TournamentImageSelectionStats {
  knownWins: number;
  knownLosses: number;
  strength: number;
  predCount: number;
  succCount: number;
  certainty: number;
  relations: number;
}

interface TournamentPairSelectionStats {
  pair: [GalleryImage, GalleryImage];
  gainIfLeftWins: number;
  gainIfRightWins: number;
  guaranteedGain: number;
  expectedGain: number;
  strengthGap: number;
  isStrictBridge: boolean;
  score: number;
}

// TODO performance improvement: consider bitset-based sets to reduce memory/GC pressure

export class Tournament {

  private static readonly OBVIOUS_GAP_THRESHOLD: number = 0.28;
  private static readonly HIGH_VALUE_RATIO: number = 0.75;
  private static readonly RELAXED_HIGH_VALUE_RATIO: number = 0.60;
  private static readonly BRIDGE_MIN_RATIO: number = 0.40;
  private static readonly EXPECTED_GAIN_WEIGHT_FACTOR: number = 0.25;
  private static readonly BRIDGE_BONUS_WEIGHT: number = 0.20;
  private static readonly MIN_PAIR_WEIGHT: number = 0.001;

  private images: GalleryImage[] = [];
  private imagesToCompare: GalleryImage[] = [];
  private graph = new Map<GalleryImage, Set<GalleryImage>>();
  private availableComparisons: [GalleryImage, GalleryImage][];
  private availableKeyToIndex: Map<string, number>;
  private imageById = new Map<string, GalleryImage>();
  private imageByIdSize = 0;
  private imageByIdSource: GalleryImage[] | null = null;
  private comparisonAdjacency: Map<string, string[]> | null = null;
  private comparisonAdjacencySource: [string, string][] | null = null;
  private comparisonAdjacencyCount = 0;

  public comparisons: [GalleryImage, GalleryImage][];
  public readonly comparison: WritableSignal<[GalleryImage, GalleryImage]> = signal(null);
  private availableComparisonsCount: number | null = null;

  public totalComparisons: number = 0;
  public remainingComparisons: number = 0;
  public completeComparisons: number = 0;
  public estimateComparisons: number = 0;

  public start(images: GalleryImage[], imagesToCompare: GalleryImage[], state: TournamentState): void {
    this.estimateComparisons = this.calculateEstimateComparisons(imagesToCompare.length);

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

    this.comparison.set(this.getNextComparison());
  }

  public matchesImagesToCompare(images: GalleryImage[]): boolean {
    if (!images) return this.imagesToCompare.length === 0;
    if (images.length !== this.imagesToCompare.length) return false;
    const ids = new Set(this.imagesToCompare.map(image => image.id));
    for (const image of images) {
      if (!ids.delete(image.id)) return false;
    }
    return ids.size === 0;
  }

  public get progressPercent(): number {
    return this.totalComparisons === 0 ? 0 : (this.completeComparisons / this.totalComparisons) * 100;
  }

  public get estimateProgressPercent(): number {
    return this.estimateComparisons === 0 ? 0 : Math.min(100, (this.completeComparisons / this.estimateComparisons) * 100);
  }

  private calculateEstimateComparisons(imageCount: number): number {
    if (imageCount <= 1) return 0;
    const logFactor = 0.914; // retuned to align closer to observed simulation counts
    const linearFactor = 0.734; // compensates for smaller image sets
    return Math.round(imageCount * (logFactor * Math.log2(imageCount) + linearFactor));
  }

  public updateProgress(): void {
    if (!this.comparisons) {
      this.completeComparisons = 0;
      this.remainingComparisons = 0;
      this.totalComparisons = 0;
      return;
    }
    const progress = this.getComparisonProgress();
    this.completeComparisons = progress.completed;
    this.remainingComparisons = progress.remaining;
    this.totalComparisons = progress.total;
  }

  public getNextComparison(): [GalleryImage, GalleryImage] {
    const available: [GalleryImage, GalleryImage][] = this.collectAvailableComparisons();
    if (available.length === 0) return null;

    const selectionStats = this.getImageSelectionStats();
    const filteredPairs = this.filterHighValueComparisons(available, selectionStats);
    const selectedPair = this.pickWeightedRandomComparison(filteredPairs);

    if (!selectedPair) {
      return this.withRandomOrder(this.getRandomAvailableComparison(available));
    }

    return this.withRandomOrder(selectedPair);
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

  private getRandomAvailableComparison(available: [GalleryImage, GalleryImage][]): [GalleryImage, GalleryImage] {
    if (ArrayUtils.isEmpty(available)) return null;
    return RandomUtils.from(available);
  }

  private withRandomOrder(pair: [GalleryImage, GalleryImage]): [GalleryImage, GalleryImage] {
    if (!pair) return null;
    return RandomUtils.boolean() ? [pair[0], pair[1]] : [pair[1], pair[0]];
  }

  private getImageSelectionStats(): Map<string, TournamentImageSelectionStats> {
    const imageIds = new Set(this.imagesToCompare.map(image => image.id));
    const imageCount = this.imagesToCompare.length;
    const statsById = new Map<string, TournamentImageSelectionStats>();
    const maxKnownRelations = Math.max(1, imageCount - 1);

    for (const image of this.imagesToCompare) {
      const knownWins = this.countKnownWins(image, imageIds);
      const knownLosses = this.countKnownLosses(image);
      const relations = knownWins + knownLosses;
      const strength = (knownWins + 1) / (knownWins + knownLosses + 2);
      const certainty = relations / maxKnownRelations;

      statsById.set(image.id, {
        knownWins,
        knownLosses,
        strength,
        predCount: knownLosses + 1,
        succCount: knownWins + 1,
        certainty,
        relations
      });
    }

    return statsById;
  }

  private countKnownWins(image: GalleryImage, imageIds: Set<string>): number {
    let knownWins = 0;
    for (const target of this.graph.get(image) ?? []) {
      if (target.id !== image.id && imageIds.has(target.id)) {
        knownWins++;
      }
    }
    return knownWins;
  }

  private countKnownLosses(image: GalleryImage): number {
    let knownLosses = 0;
    for (const candidate of this.imagesToCompare) {
      if (candidate !== image && this.graph.get(candidate)?.has(image)) {
        knownLosses++;
      }
    }
    return knownLosses;
  }

  private getPairSelectionStats(
    pair: [GalleryImage, GalleryImage],
    statsById: Map<string, TournamentImageSelectionStats>
  ): TournamentPairSelectionStats {
    const left = statsById.get(pair[0].id);
    const right = statsById.get(pair[1].id);
    const imageCount = this.imagesToCompare.length;

    if (!left || !right) {
      return {
        pair,
        gainIfLeftWins: 0,
        gainIfRightWins: 0,
        guaranteedGain: 0,
        expectedGain: 0,
        strengthGap: 0,
        isStrictBridge: false,
        score: 0
      };
    }

    const gainIfLeftWins = left.predCount * right.succCount;
    const gainIfRightWins = right.predCount * left.succCount;
    const guaranteedGain = Math.min(gainIfLeftWins, gainIfRightWins);
    const expectedGain = 0.5 * (gainIfLeftWins + gainIfRightWins);
    const strengthGap = Math.abs(left.strength - right.strength);
    const isStrictBridge =
      (this.isLowRelationImage(left, imageCount) && this.isStrictHubImage(right, imageCount)) ||
      (this.isLowRelationImage(right, imageCount) && this.isStrictHubImage(left, imageCount));

    return {
      pair,
      gainIfLeftWins,
      gainIfRightWins,
      guaranteedGain,
      expectedGain,
      strengthGap,
      isStrictBridge,
      score: 0
    };
  }

  private isLowRelationImage(stats: TournamentImageSelectionStats, imageCount: number): boolean {
    const lowRelationsThreshold = Math.max(1, Math.floor(0.08 * Math.max(0, imageCount - 1)));
    return stats.relations <= lowRelationsThreshold;
  }

  private isStrictHubImage(stats: TournamentImageSelectionStats, imageCount: number): boolean {
    const strictHubRelationThreshold = Math.max(4, Math.floor(0.30 * Math.max(0, imageCount - 1)));
    return stats.knownWins >= 2 && stats.knownLosses >= 2 && stats.relations >= strictHubRelationThreshold;
  }

  private filterHighValueComparisons(
    selectable: [GalleryImage, GalleryImage][],
    statsById: Map<string, TournamentImageSelectionStats>
  ): TournamentPairSelectionStats[] {
    const pairStats = selectable.map(pair => this.getPairSelectionStats(pair, statsById));
    if (!pairStats.length) return [];

    const richMinRelations = Math.max(2, Math.floor(0.15 * Math.max(0, this.imagesToCompare.length - 1)));
    const postMismatchFilter = pairStats.filter(stats => {
      const left = statsById.get(stats.pair[0].id);
      const right = statsById.get(stats.pair[1].id);
      if (!left || !right) return true;
      const obviousMismatch = left.relations >= richMinRelations &&
        right.relations >= richMinRelations &&
        stats.strengthGap >= Tournament.OBVIOUS_GAP_THRESHOLD;
      return !obviousMismatch;
    });

    const baseline = postMismatchFilter.length ? postMismatchFilter : pairStats;
    const maxGuaranteedGain = baseline.reduce((max, stats) => Math.max(max, stats.guaranteedGain), 0);
    const primaryThreshold = maxGuaranteedGain * Tournament.HIGH_VALUE_RATIO;
    const relaxedThreshold = maxGuaranteedGain * Tournament.RELAXED_HIGH_VALUE_RATIO;
    const bridgeThreshold = maxGuaranteedGain * Tournament.BRIDGE_MIN_RATIO;

    let filtered = baseline.filter(stats => stats.guaranteedGain >= primaryThreshold);
    if (!filtered.length) {
      filtered = baseline.filter(stats => stats.guaranteedGain >= relaxedThreshold);
    }

    if (!filtered.length) {
      filtered = baseline.slice();
    }

    const seen = new Set(filtered.map(stats => this.makePairKey(stats.pair[0], stats.pair[1])));
    for (const stats of baseline) {
      if (!stats.isStrictBridge || stats.guaranteedGain < bridgeThreshold) continue;
      const key = this.makePairKey(stats.pair[0], stats.pair[1]);
      if (seen.has(key)) continue;
      filtered.push(stats);
      seen.add(key);
    }

    return filtered.length ? filtered : pairStats;
  }

  private getPairWeight(stats: TournamentPairSelectionStats): number {
    const bridgeBonus = stats.isStrictBridge ? 1 : 0;
    const rawWeight = stats.guaranteedGain +
      Tournament.EXPECTED_GAIN_WEIGHT_FACTOR * stats.expectedGain +
      Tournament.BRIDGE_BONUS_WEIGHT * bridgeBonus;
    return Math.max(Tournament.MIN_PAIR_WEIGHT, rawWeight);
  }

  private pickWeightedRandomComparison(candidates: TournamentPairSelectionStats[]): [GalleryImage, GalleryImage] {
    if (!candidates.length) return null;

    const weightedCandidates = candidates.map(stats => ({
      pair: stats.pair,
      weight: this.getPairWeight(stats)
    }));

    const totalWeight = weightedCandidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    if (totalWeight <= 0) {
      return RandomUtils.from(weightedCandidates).pair;
    }

    let remaining = RandomUtils.number(totalWeight);
    for (const candidate of weightedCandidates) {
      remaining -= candidate.weight;
      if (remaining <= 0) {
        return candidate.pair;
      }
    }

    return weightedCandidates[weightedCandidates.length - 1].pair;
  }

  private hasPath(from: GalleryImage, to: GalleryImage): boolean {
    return this.graph.get(from)?.has(to) ?? false;
  }

  public handleUserInput(winner: GalleryImage, loser?: GalleryImage): void {
    if (!loser) {
      const currentComparison = this.comparison();
      if (!currentComparison) {
        return;
      }
      loser = currentComparison[0] === winner ? currentComparison[1] : currentComparison[0];
    }

    this.graph.get(winner).add(loser);
    this.comparisons.push([winner, loser]);

    this.updateTransitiveRelations(winner, loser);

    this.comparison.set(this.getNextComparison());

    this.updateProgress();
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
    return this.getRankingFor(this.imagesToCompare);
  }

  public getImagesToCompare(): GalleryImage[] {
    return this.imagesToCompare ?? [];
  }

  public getNearestWinners(image: GalleryImage): GalleryImage[] {
    if (!image) return [];

    const ranking = this.getRankingFor(this.images);
    const startIndex = ranking.indexOf(image);
    if (startIndex === -1) return [];

    const result: GalleryImage[] = [];
    for (let i = startIndex - 1; i >= 0; i--) {
      const candidate = ranking[i];
      if (this.graph.get(candidate)?.has(image)) result.push(candidate);
    }

    return result;
  }

  public getNearestLosers(image: GalleryImage): GalleryImage[] {
    if (!image) return [];

    const beatenImages = this.graph.get(image);
    if (!beatenImages || beatenImages.size === 0) return [];

    const ranking = this.getRankingFor(this.images);
    const startIndex = ranking.indexOf(image);
    if (startIndex === -1) return [];

    const result: GalleryImage[] = [];
    for (let i = startIndex + 1; i < ranking.length; i++) {
      const candidate = ranking[i];
      if (beatenImages.has(candidate)) result.push(candidate);
    }

    return result;
  }

  private getRankingFor(images: GalleryImage[]): GalleryImage[] {
    const source = images ?? [];
    const indegree = new Map<GalleryImage, number>();
    source.forEach(image => indegree.set(image, 0));

    // Count incoming edges
    for (const [, losers] of this.graph.entries()) {
      for (const loser of losers) {
        if (!indegree.has(loser)) continue;
        indegree.set(loser, (indegree.get(loser) ?? 0) + 1);
      }
    }

    // Kahn's algorithm
    const queue: GalleryImage[] = source.filter(image => (indegree.get(image) ?? 0) === 0);
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

  public skip(): void {
    this.comparison.set(this.getNextComparison());
  }

  public undo(): [GalleryImage, GalleryImage] {
    if (ArrayUtils.isEmpty(this.comparisons)) return null;
    this.comparison.set(this.comparisons.pop() ?? null);

    this.graph = new Map<GalleryImage, Set<GalleryImage>>();
    this.images.forEach(image => this.graph.set(image, new Set<GalleryImage>()));
    this.availableComparisons = [];
    this.availableKeyToIndex = new Map<string, number>();

    for (const [winner, loser] of this.comparisons) {
      this.graph.get(winner).add(loser);
      this.updateTransitiveRelations(winner, loser);
    }

    this.rebuildAvailableComparisons();

    this.updateProgress();
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

  public getImageByIdMap(images: GalleryImage[]): Map<string, GalleryImage> {
    if (this.imageByIdSource !== images || this.imageByIdSize !== images.length) {
      this.imageById.clear();
      for (const image of images) {
        this.imageById.set(image.id, image);
      }
      this.imageByIdSource = images;
      this.imageByIdSize = images.length;
    }
    return this.imageById;
  }

  public getComparisonAdjacency(comparisons: [string, string][]): Map<string, string[]> {
    if (this.comparisonAdjacency && this.comparisonAdjacencySource === comparisons && this.comparisonAdjacencyCount === comparisons.length) {
      return this.comparisonAdjacency;
    }

    const adjacency = new Map<string, string[]>();
    for (const [winnerId, loserId] of comparisons) {
      const targets = adjacency.get(winnerId);
      if (targets) {
        targets.push(loserId);
      } else {
        adjacency.set(winnerId, [loserId]);
      }
    }

    this.comparisonAdjacency = adjacency;
    this.comparisonAdjacencySource = comparisons;
    this.comparisonAdjacencyCount = comparisons.length;
    return adjacency;
  }

}
