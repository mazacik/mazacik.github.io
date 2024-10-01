import { Contender } from "../classes/contender.class";
import { ArrayUtils } from "./array.utils";

export abstract class TournamentUtils {

  public static getBetterThan(imageId: string, images: string[], directlyBetterThan: { [key: string]: string[] }, collector: string[] = []): string[] {
    for (const otherItem of directlyBetterThan[imageId]) {
      ArrayUtils.push(collector, otherItem);
      TournamentUtils.getBetterThan(otherItem, images, directlyBetterThan, collector);
    }
    return collector;
  }

  public static getFirst<T>(contenders: Contender<T>[]): Contender<T> {
    for (const contender of contenders) {
      if (contender.getBetterThan().length == contenders.length - 1) return contender;
    }
  }

  public static getLeaderboard<T>(first: Contender<T>, contenders: Contender<T>[]): Contender<T>[] {
    const leaderboard: Contender<T>[] = [];

    let someItem: Contender<T> = first;
    while (someItem) {
      leaderboard.push(someItem);
      if (someItem.directlyBetterThan.length == 1) {
        someItem = someItem.directlyBetterThan[0];
      } else {
        someItem = null;
      }
    }

    const uncertain: [Contender<T>, number][] = [];
    contenders.filter(item => !leaderboard.includes(item)).forEach(item => uncertain.push([item, item.getBetterThan().length]));
    uncertain.sort((i1, i2) => i2[1] - i1[1]);
    ArrayUtils.push(leaderboard, uncertain.map(item => item[0]));

    return leaderboard;
  }

}
