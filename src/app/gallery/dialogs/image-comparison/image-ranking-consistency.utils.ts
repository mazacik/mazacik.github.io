export interface ImageRankingConsistencyCheck {
  comparisonSubjectIds: [string, string];
  higherRankedSubjectId: string;
}

export abstract class ImageRankingConsistencyUtils {
  private static readonly NEIGHBOR_OFFSETS: number[] = [3, 2, 1, -1, -2, -3];

  public static createCheck(rankedSubjectIds: string[], random: () => number = Math.random): ImageRankingConsistencyCheck | null {
    if ((rankedSubjectIds?.length ?? 0) < 2) {
      return null;
    }

    const anchorIndex = this.randomIndex(rankedSubjectIds.length, random);
    const neighborIndexes = this.NEIGHBOR_OFFSETS.map((offset) => anchorIndex + offset).filter((index) => index >= 0 && index < rankedSubjectIds.length);
    const neighborIndex = neighborIndexes[this.randomIndex(neighborIndexes.length, random)];
    const higherRankedSubjectId = rankedSubjectIds[Math.min(anchorIndex, neighborIndex)];
    const lowerRankedSubjectId = rankedSubjectIds[Math.max(anchorIndex, neighborIndex)];
    const comparisonSubjectIds: [string, string] = random() < 0.5 ? [higherRankedSubjectId, lowerRankedSubjectId] : [lowerRankedSubjectId, higherRankedSubjectId];

    return {
      comparisonSubjectIds,
      higherRankedSubjectId,
    };
  }

  private static randomIndex(length: number, random: () => number): number {
    return Math.floor(random() * length);
  }
}
