import { ArrayUtils } from "../utils/array.utils";

export class Contender<T> {

  public id: string;
  public object: T;
  public directlyBetterThan: Contender<T>[];
  public betterThan: Contender<T>[];

  private static counter: number = 0;
  private static test: Map<Contender<unknown>, Contender<unknown>[]> = new Map();

  constructor(id: string, object: T) {
    this.id = id;
    this.object = object;
    this.directlyBetterThan = [];
  }

  public updateBetterThan(): void {
    this.betterThan = this.getBetterThan(true);
  }

  public isBetterThan(other: Contender<T>, forceUpdate: boolean = false): boolean {
    if (!this.betterThan || forceUpdate) {
      this.updateBetterThan();
    }

    return this.betterThan.includes(other);
  }

  public getBetterThan(forceUpdate: boolean = false): Contender<T>[] {
    console.log(++Contender.counter);
    if (!this.betterThan || forceUpdate) {
      this.betterThan = this.directlyBetterThan.slice();
      for (const otherItem of this.directlyBetterThan) {
        ArrayUtils.push(this.betterThan, otherItem.getBetterThan(forceUpdate));
      }
    }

    return this.betterThan;
  }

}
