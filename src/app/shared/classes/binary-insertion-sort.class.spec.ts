import { BinaryInsertionSort } from './binary-insertion-sort.class';

describe('BinaryInsertionSort direct placement', () => {
  let sort: BinaryInsertionSort;

  beforeEach(() => {
    sort = new BinaryInsertionSort();
    sort.start(['a', 'b', 'c', 'active', 'next'], {
      rankedImageIds: ['a', 'b', 'c'],
      pendingImageIds: ['next'],
      activeInsertion: { imageId: 'active', low: 1, high: 2 }
    });
  });

  for (const [index, expected] of [
    [0, ['active', 'a', 'b', 'c']],
    [1, ['a', 'active', 'b', 'c']],
    [3, ['a', 'b', 'c', 'active']]
  ] as [number, string[]][]) {
    it(`places at gap ${index}, overriding the narrowed interval and advancing once`, () => {
      const version = sort.stateVersion();
      expect(sort.placeActiveInsertion('active', index)).toBeTrue();
      expect(sort.rankedImageIds).toEqual(expected);
      expect(sort.activeInsertion).toEqual({ imageId: 'next', low: 0, high: 4 });
      expect(sort.pendingImageIds).toEqual([]);
      expect(sort.stateVersion()).toBe(version + 1);
    });
  }

  it('rejects invalid indexes without changing state or notifying', () => {
    const before = sort.getState();
    const version = sort.stateVersion();
    for (const index of [-1, 4, 1.5, NaN, Infinity]) {
      expect(sort.placeActiveInsertion('active', index)).toBeFalse();
      expect(sort.getState()).toEqual(before);
      expect(sort.stateVersion()).toBe(version);
    }
  });

  it('rejects stale and unrelated subjects, including a duplicate confirmation', () => {
    expect(sort.placeActiveInsertion('a', 1)).toBeFalse();
    expect(sort.placeActiveInsertion('missing', 1)).toBeFalse();
    sort.placeActiveInsertion('active', 1);
    const before = sort.getState();
    expect(sort.placeActiveInsertion('active', 1)).toBeFalse();
    expect(sort.getState()).toEqual(before);
  });

  it('clears an opponent override for the next image', () => {
    sort.setComparisonOpponent('b');
    sort.placeActiveInsertion('active', 0);
    expect(sort.currentComparisonIds).toEqual(['next', 'b']);
  });

  it('completes the ranking and preserves the saved state shape', () => {
    sort.placeActiveInsertion('active', 0);
    sort.placeActiveInsertion('next', 4);
    expect(sort.currentComparisonIds).toBeNull();
    expect(sort.pendingCountIncludingActive).toBe(0);
    const saved = sort.getState();
    expect(Object.keys(saved).sort()).toEqual(['activeInsertion', 'pendingImageIds', 'rankedImageIds']);
    sort.start(['a', 'b', 'c', 'active', 'next'], saved);
    expect(sort.getState()).toEqual(saved);
    expect(sort.placeActiveInsertion('next', 0)).toBeFalse();
  });
});
