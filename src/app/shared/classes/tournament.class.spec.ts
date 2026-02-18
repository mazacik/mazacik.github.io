import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ArrayUtils } from '../utils/array.utils';
import { Tournament } from './tournament.class';

describe('Tournament minimal-comparison selector', () => {
  beforeEach(() => {
    spyOn(ArrayUtils, 'shuffle').and.callFake(array => array);
  });

  it('always returns an unresolved pair', () => {
    const { tournament, byId } = setupTournament(['A', 'B', 'C', 'D']);
    tournament.handleUserInput(byId.get('A'), byId.get('B'));

    const next = tournament.getNextComparison();
    expect(next).toBeTruthy();

    const available = (tournament as any).collectAvailableComparisons() as [GalleryImage, GalleryImage][];
    expect(available.map(pairToKey)).toContain(pairToKey(next));
  });

  it('filters obvious strong-vs-weak mismatches when alternatives exist', () => {
    const { tournament, byId } = setupTournament(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

    tournament.handleUserInput(byId.get('A'), byId.get('E'));
    tournament.handleUserInput(byId.get('A'), byId.get('F'));
    tournament.handleUserInput(byId.get('G'), byId.get('B'));
    tournament.handleUserInput(byId.get('H'), byId.get('B'));

    tournament.handleUserInput(byId.get('C'), byId.get('G'));
    tournament.handleUserInput(byId.get('C'), byId.get('H'));
    tournament.handleUserInput(byId.get('E'), byId.get('D'));
    tournament.handleUserInput(byId.get('F'), byId.get('D'));

    const statsById = (tournament as any).getImageSelectionStats();
    const filtered = (tournament as any).filterHighValueComparisons([
      [byId.get('A'), byId.get('B')],
      [byId.get('E'), byId.get('H')]
    ], statsById) as Array<{ pair: [GalleryImage, GalleryImage] }>;

    expect(filtered.map(entry => pairToKey(entry.pair))).not.toContain('A|B');
    expect(filtered.map(entry => pairToKey(entry.pair))).toContain('E|H');
  });

  it('prefers higher guaranteed-gain pairs', () => {
    const { tournament, byId } = setupTournament(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

    tournament.handleUserInput(byId.get('A'), byId.get('C'));
    tournament.handleUserInput(byId.get('A'), byId.get('D'));
    tournament.handleUserInput(byId.get('E'), byId.get('A'));
    tournament.handleUserInput(byId.get('F'), byId.get('A'));

    tournament.handleUserInput(byId.get('B'), byId.get('G'));
    tournament.handleUserInput(byId.get('B'), byId.get('H'));
    tournament.handleUserInput(byId.get('E'), byId.get('B'));
    tournament.handleUserInput(byId.get('F'), byId.get('B'));

    const statsById = (tournament as any).getImageSelectionStats();
    const filtered = (tournament as any).filterHighValueComparisons([
      [byId.get('A'), byId.get('B')],
      [byId.get('C'), byId.get('G')]
    ], statsById) as Array<{ pair: [GalleryImage, GalleryImage] }>;

    expect(filtered.map(entry => pairToKey(entry.pair))).toContain('A|B');
    expect(filtered.map(entry => pairToKey(entry.pair))).not.toContain('C|G');

    const selected = withSeededRandom(1, () => (tournament as any).pickWeightedRandomComparison(filtered)) as [GalleryImage, GalleryImage];
    expect(pairToKey(selected)).toBe('A|B');
  });

  it('keeps strict-hub bridge pairs for low-relation images', () => {
    const { tournament, byId } = setupTournament(['A', 'B', 'H', 'L', 'C', 'D', 'E', 'F', 'G', 'I', 'J']);

    tournament.handleUserInput(byId.get('A'), byId.get('C'));
    tournament.handleUserInput(byId.get('A'), byId.get('D'));
    tournament.handleUserInput(byId.get('E'), byId.get('A'));
    tournament.handleUserInput(byId.get('F'), byId.get('A'));

    tournament.handleUserInput(byId.get('B'), byId.get('G'));
    tournament.handleUserInput(byId.get('I'), byId.get('B'));

    tournament.handleUserInput(byId.get('H'), byId.get('C'));
    tournament.handleUserInput(byId.get('H'), byId.get('G'));
    tournament.handleUserInput(byId.get('E'), byId.get('H'));
    tournament.handleUserInput(byId.get('F'), byId.get('H'));

    const statsById = (tournament as any).getImageSelectionStats();
    const filtered = (tournament as any).filterHighValueComparisons([
      [byId.get('A'), byId.get('B')],
      [byId.get('L'), byId.get('H')]
    ], statsById) as Array<{ pair: [GalleryImage, GalleryImage] }>;

    const keys = filtered.map(entry => pairToKey(entry.pair));
    expect(keys).toContain('A|B');
    expect(keys).toContain('H|L');
  });

  it('falls back safely when aggressive mismatch filtering removes all candidates', () => {
    const { tournament, byId } = setupTournament(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

    tournament.handleUserInput(byId.get('A'), byId.get('E'));
    tournament.handleUserInput(byId.get('A'), byId.get('F'));
    tournament.handleUserInput(byId.get('G'), byId.get('B'));
    tournament.handleUserInput(byId.get('H'), byId.get('B'));

    tournament.handleUserInput(byId.get('C'), byId.get('G'));
    tournament.handleUserInput(byId.get('C'), byId.get('H'));
    tournament.handleUserInput(byId.get('E'), byId.get('D'));
    tournament.handleUserInput(byId.get('F'), byId.get('D'));

    const statsById = (tournament as any).getImageSelectionStats();
    const filtered = (tournament as any).filterHighValueComparisons([
      [byId.get('A'), byId.get('B')],
      [byId.get('A'), byId.get('D')]
    ], statsById) as Array<{ pair: [GalleryImage, GalleryImage] }>;

    expect(filtered.length).toBeGreaterThan(0);
  });

  it('skip returns a valid unresolved pair', () => {
    const { tournament } = setupTournament(['A', 'B', 'C', 'D']);

    tournament.skip();

    const current = tournament.comparison();
    expect(current).toBeTruthy();

    const available = (tournament as any).collectAvailableComparisons() as [GalleryImage, GalleryImage][];
    expect(available.map(pairToKey)).toContain(pairToKey(current));
  });

  it('falls back correctly for zero or one available pair', () => {
    const { tournament: oneImageTournament } = setupTournament(['A']);
    expect(oneImageTournament.getNextComparison()).toBeNull();

    const { tournament: twoImageTournament } = setupTournament(['A', 'B']);
    const onlyPairKey = pairToKey(twoImageTournament.comparison());
    const next = twoImageTournament.getNextComparison();

    expect(pairToKey(next)).toBe(onlyPairKey);
  });

  it('reduces median comparisons vs random baseline in deterministic benchmark', () => {
    const runCount = 31;
    const { ranking, preComparisons } = createGuaranteedGainBenchmarkScenario();
    const randomCounts: number[] = [];
    const smartCounts: number[] = [];

    for (let run = 1; run <= runCount; run++) {
      const seed = run * 97 + 3;

      const randomMetrics = simulateTournament(ranking, seed, () => new RandomSelectorTournament(), preComparisons);
      const smartMetrics = simulateTournament(ranking, seed, () => new Tournament(), preComparisons);

      randomCounts.push(randomMetrics.comparisonCount);
      smartCounts.push(smartMetrics.comparisonCount);
    }

    const randomMedian = median(randomCounts);
    const smartMedian = median(smartCounts);
    const pathologicalRunCount = smartCounts.filter((count, index) => count > randomCounts[index] * 1.25).length;

    expect(smartMedian).toBeLessThan(randomMedian);
    expect(pathologicalRunCount).toBeLessThanOrEqual(Math.floor(runCount * 0.10));
  });
});

class RandomSelectorTournament extends Tournament {
  public override getNextComparison(): [GalleryImage, GalleryImage] {
    const available = (this as any).collectAvailableComparisons() as [GalleryImage, GalleryImage][];
    if (!available.length) return null;
    const pair = (this as any).getRandomAvailableComparison(available) as [GalleryImage, GalleryImage];
    return (this as any).withRandomOrder(pair) as [GalleryImage, GalleryImage];
  }
}

function setupTournament(
  ids: string[],
  tournamentFactory: () => Tournament = () => new Tournament(),
  stateComparisons: [string, string][] = []
): { tournament: Tournament; images: GalleryImage[]; byId: Map<string, GalleryImage> } {
  const images = ids.map(id => createImage(id));
  const byId = new Map(images.map(image => [image.id, image]));
  const tournament = tournamentFactory();
  tournament.start(images, images, stateComparisons.length ? { comparisons: stateComparisons } : null);
  return { tournament, images, byId };
}

function createImage(id: string): GalleryImage {
  const image = new GalleryImage();
  image.id = id;
  return image;
}

function pairToKey(pair: [GalleryImage, GalleryImage] | null): string | null {
  if (!pair) return null;
  const ids = [pair[0].id, pair[1].id].sort();
  return `${ids[0]}|${ids[1]}`;
}

function createGuaranteedGainBenchmarkScenario(): { ranking: string[]; preComparisons: [string, string][] } {
  const higher = ['H0', 'H1', 'H2', 'H3', 'H4', 'H5'];
  const centers = ['X', 'Y'];
  const lower = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
  const ranking = [...higher, ...centers, ...lower];
  const preComparisons: [string, string][] = [];

  preComparisons.push(['H0', 'X'], ['H1', 'X'], ['H2', 'X']);
  preComparisons.push(['X', 'L0'], ['X', 'L1'], ['X', 'L2']);
  preComparisons.push(['H3', 'Y'], ['H4', 'Y'], ['H5', 'Y']);
  preComparisons.push(['Y', 'L3'], ['Y', 'L4'], ['Y', 'L5']);

  return { ranking, preComparisons };
}

function simulateTournament(
  ranking: string[],
  seed: number,
  tournamentFactory: () => Tournament,
  preComparisons: [string, string][] = []
): { comparisonCount: number } {
  return withSeededRandom(seed, () => {
    const { tournament } = setupTournament(ranking, tournamentFactory, preComparisons);
    const rankById = new Map(ranking.map((id, index) => [id, index]));

    while (tournament.comparison()) {
      const [left, right] = tournament.comparison();
      const leftRank = rankById.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = rankById.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      const winner = leftRank <= rightRank ? left : right;
      tournament.handleUserInput(winner);
    }

    return {
      comparisonCount: tournament.comparisons.length
    };
  });
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function withSeededRandom<T>(seed: number, run: () => T): T {
  const originalRandom = Math.random;
  Math.random = seededRandom(seed);
  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const ordered = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 0) {
    return (ordered[middle - 1] + ordered[middle]) / 2;
  }
  return ordered[middle];
}
