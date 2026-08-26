import { ImageRankingConsistencyUtils } from './image-ranking-consistency.utils';

describe('ImageRankingConsistencyUtils', () => {
  const rankedSubjectIds = Array.from({ length: 10 }, (_, index) => `image:${index}`);

  it('returns null when a pair cannot be created', () => {
    expect(ImageRankingConsistencyUtils.createCheck([], () => 0)).toBeNull();
    expect(ImageRankingConsistencyUtils.createCheck(['image:0'], () => 0)).toBeNull();
  });

  it('selects an in-bounds neighbor no more than three positions from the anchor', () => {
    const randomValues = [0, 0, 0];
    const check = ImageRankingConsistencyUtils.createCheck(rankedSubjectIds, () => randomValues.shift() ?? 0);

    expect(check).toEqual({
      comparisonSubjectIds: ['image:0', 'image:3'],
      higherRankedSubjectId: 'image:0',
    });
  });

  it('filters positive offsets when the anchor is at the end of the ranking', () => {
    const randomValues = [0.99, 0.99, 0];
    const check = ImageRankingConsistencyUtils.createCheck(rankedSubjectIds, () => randomValues.shift() ?? 0);

    expect(check).toEqual({
      comparisonSubjectIds: ['image:6', 'image:9'],
      higherRankedSubjectId: 'image:6',
    });
  });

  it('can display the lower-ranked subject first', () => {
    const randomValues = [0.4, 0.25, 0.75];
    const check = ImageRankingConsistencyUtils.createCheck(rankedSubjectIds, () => randomValues.shift() ?? 0);

    expect(check).toEqual({
      comparisonSubjectIds: ['image:6', 'image:4'],
      higherRankedSubjectId: 'image:4',
    });
  });
});
