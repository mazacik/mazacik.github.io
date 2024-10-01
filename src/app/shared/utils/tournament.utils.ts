import { GalleryImage } from "src/app/gallery/model/gallery-image.class";
import { Contender } from "../classes/contender.class";
import { ArrayUtils } from "./array.utils";

export abstract class TournamentUtils {

  // getContenders(serializable data): Contender[]

  public static updateBetterThan<T>(contenders: Contender<T>[]): void {
    contenders.forEach(contender => contender.betterThan.length = 0);
    
  }

  public static getFirst<T>(contenders: Contender<T>[]): Contender<T> {
    for (const contender of contenders) {
      if (contender.getBetterThan().length == contenders.length - 1) return contender;
    }
  }

  public static a(images: GalleryImage[], directlyBetterThanIds: { [key: string]: string[] }): GalleryImage[] {
    const contenders: Contender<GalleryImage>[] = images.map(image => new Contender<GalleryImage>(image.id, image));
    contenders.forEach(contender => contender.directlyBetterThan = directlyBetterThanIds[contender.id].map(directlyBetterThanId => contenders.find(c => c.id == directlyBetterThanId)));
    const first: Contender<GalleryImage> = this.getFirst(contenders);
    contenders.forEach(contender => contender.betterThan.length = 0); // cleanup
    console.log(first);
    if (first) {
      return this.getLeaderboard(first, contenders).map(contender => contender.object);
    }
  }

  public static getBetterThan(imageId: string, images: string[], directlyBetterThan: { [key: string]: string[] }, collector: string[] = []): string[] {
    for (const otherItem of directlyBetterThan[imageId]) {
      ArrayUtils.push(collector, otherItem);
      TournamentUtils.getBetterThan(otherItem, images, directlyBetterThan, collector);
    }
    return collector;
  }

  public static getLeaderboard<T>(first: Contender<T>, data: Contender<T>[]): Contender<T>[] {
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
    data.filter(item => !leaderboard.includes(item)).forEach(item => uncertain.push([item, item.getBetterThan().length]));
    uncertain.sort((i1, i2) => i2[1] - i1[1]);
    ArrayUtils.push(leaderboard, uncertain.map(item => item[0]));

    return leaderboard;
  }

}
