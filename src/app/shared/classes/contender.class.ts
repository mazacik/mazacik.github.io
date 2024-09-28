import { ArrayUtils } from "../utils/array.utils";

export class Contender<T> {

  public id: string;
  public object: T;
  public directlyBetterThan: Contender<T>[];

  constructor(id: string, object: T) {
    this.id = id;
    this.object = object;
    this.directlyBetterThan = [];
  }

  public isBetterThan(other: Contender<T>): boolean {
    if (this.directlyBetterThan.includes(other)) return true;
    for (const anotherItem of this.directlyBetterThan) {
      if (anotherItem.isBetterThan(other)) return true;
    }
  }

  public getBetterThan(collector: Contender<T>[] = []): Contender<T>[] {
    for (const otherItem of this.directlyBetterThan) {
      ArrayUtils.push(collector, otherItem);
      otherItem.getBetterThan(collector);
    }
    return collector;
  }

}