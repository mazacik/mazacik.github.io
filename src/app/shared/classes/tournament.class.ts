import { ArrayUtils } from 'src/app/shared/utils/array.utils';

export class Tournament<T> {

  public data: T[];
  private getKey: (item: T) => string;
  public directlyBetterThan: { [key: string]: T[] };

  private queue: [T, T][] = [];
  public comparison: [T, T];
  private waitingForOpponent: T = null;
  private previousWinner: T = null;

  public leaderboard: T[] = [];

  constructor(data: T[], getKey: (item: T) => string, directlyBetterThan: { [key: string]: T[] } = {}) {
    this.data = data.slice();
    this.getKey = getKey;
    this.directlyBetterThan = directlyBetterThan;

    let key: string;
    this.data.forEach(item => {
      key = this.getKey(item);
      if (!this.directlyBetterThan[key]) {
        this.directlyBetterThan[key] = [];
      }
    });

    const elementsToCompare = data.slice();
    for (const betterThan of Object.values(this.directlyBetterThan)) {
      ArrayUtils.remove(elementsToCompare, betterThan);
    }

    this.createQueue(elementsToCompare);
    this.nextComparison();
  }

  public getQueueLength(): number {
    return this.queue?.length;
  }

  private createQueue(source: T[]): void {
    this.queue.length = 0;

    let item1: T;
    let item2: T;

    const shuffle: T[] = ArrayUtils.shuffle(source.slice());
    while (shuffle.length > 0) {
      item1 = shuffle.shift();
      item2 = shuffle.shift();
      if (item2) {
        this.queue.push([item1, item2]);
      } else {
        this.waitingForOpponent = item1;
      }
    }
  }

  private nextComparison(): void {
    const comparison: [T, T] = this.queue.shift();
    if (!comparison) {
      this.resolveTies(this.waitingForOpponent);
      return;
    }

    let autoWinner: T = null;
    if (this.getBetterThan(comparison[0]).includes(comparison[1])) {
      autoWinner = comparison[0];
    } else if (this.getBetterThan(comparison[1]).includes(comparison[0])) {
      autoWinner = comparison[1];
    }

    if (autoWinner) {
      if (this.waitingForOpponent) {
        this.queue.push([this.waitingForOpponent, autoWinner]);
        this.waitingForOpponent = null;
      } else {
        this.waitingForOpponent = autoWinner;
      }

      this.nextComparison();
    } else {
      this.comparison = comparison;
      // this.addComparisonResult(this.comparison[0], this.comparison[1]); // AUTO-RESOLVE
    }
  }

  private resolveTies(winner: T): void {
    this.waitingForOpponent = null;

    if (winner) {
      this.leaderboard.push(winner);

      if (this.previousWinner) {
        this.directlyBetterThan[this.getKey(this.previousWinner)] = [winner];
        this.previousWinner = null;
      }

      const length: number = this.directlyBetterThan[this.getKey(winner)].length;
      if (length > 1) {
        this.previousWinner = winner;
        this.createQueue(this.directlyBetterThan[this.getKey(winner)]);
        // tu urobit viacero paralelnych queues, pre kazdu entitu ktora ma length>1 separatna queue a po kazdom comparison prejst na dalsiu queue, aby sa to tolko neopakovalo
        this.nextComparison();
      } else if (length == 1) {
        this.resolveTies(this.directlyBetterThan[this.getKey(winner)][0]);
      } else if (length == 0) {
        this.comparison = null;
      }
    }
  }

  private comparisonCount: number = 0;
  public addComparisonResult(winner: T, loser: T): void {
    this.comparisonCount++;
    if (this.waitingForOpponent) {
      this.queue.push([this.waitingForOpponent, winner]);
      this.waitingForOpponent = null;
    } else {
      this.waitingForOpponent = winner;
    }

    this.directlyBetterThan[this.getKey(winner)].push(loser);
    this.nextComparison();
  }

  private getBetterThan(image: T, collector: T[] = []): T[] {
    for (const _image of this.directlyBetterThan[this.getKey(image)]) {
      if (!collector.includes(_image)) {
        collector.push(_image);
        this.getBetterThan(_image, collector);
      }
    }
    return collector;
  }

  public reset(): void {
    this.leaderboard.length = 0;
    this.comparisonCount = 0;
    for (const key of Object.keys(this.directlyBetterThan)) {
      this.directlyBetterThan[key].length = 0;
    }

    this.createQueue(this.data);
    this.nextComparison();
  }

}
