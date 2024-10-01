import { ArrayUtils } from "../utils/array.utils";

export class Contender<T> {

  public id: string;
  public object: T;
  public directlyBetterThan: Contender<T>[];
  private betterThan: Contender<T>[];

  constructor(id: string, object: T) {
    this.id = id;
    this.object = object;
    this.directlyBetterThan = [];
  }

  public isBetterThan(other: Contender<T>): boolean {
    if (!this.betterThan) this.getBetterThan();
    return this.betterThan.includes(other);
  }

  public getBetterThan(): Contender<T>[] {
    if (!this.betterThan) {
      this.betterThan = this.directlyBetterThan.slice();
      for (const otherItem of this.directlyBetterThan) {
        ArrayUtils.push(this.betterThan, otherItem.getBetterThan());
      }
    }
    return this.betterThan;
  }

  public clearBetterThan(): void {
    if (this.betterThan) this.betterThan.length = 0;
  }

}
