import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { Contender } from './contender.class';

export class Tournament2<T> {

  private data: Contender<T>[] = [];

  private currentQueue: 'start' | 'winners' | 'losers' = 'start';

  private queue: Contender<T>[] = [];
  private winnersQueue: Contender<T>[] = [];
  private losersQueue: Contender<T>[] = [];

  private comparisonCount: number = 0;
  public currentComparison: [Contender<T>, Contender<T>];
  private first: Contender<T> = null;
  private last: Contender<T> = null;
  public leaderboard: Contender<T>[] = [];

  constructor(input: T[], getId: (object: T) => string) {
    this.data = input.map(object => new Contender<T>(getId(object), object));

    // TODO
    // if has directlyBetterThan, process it

    this.queue = ArrayUtils.shuffle(this.data.slice());
    this.nextComparisonLookingForWinnerAndLoser();
  }

  private nextComparisonLookingForWinnerAndLoser(): void {
    if (this.queue.length < 2) {
      if (this.currentQueue == 'start') {
        const renegade: Contender<T> = this.queue.shift();
        if (renegade) {
          this.winnersQueue.unshift(renegade);
          this.losersQueue.push(renegade);
        }
        this.queue = this.winnersQueue.slice();
        this.currentQueue = 'winners';
      } else if (this.currentQueue == 'winners') {
        if (this.queue.length == 1) {
          this.winnersQueue.unshift(this.queue[0]);
        }
        this.queue = this.losersQueue.slice();
        if (this.queue.length == 1) {
          this.first = this.queue.shift();
        }
        this.currentQueue = 'losers';
      } else if (this.currentQueue == 'losers') {
        if (this.queue.length == 1) {
          this.losersQueue.unshift(this.queue[0]);
        }
        this.queue = this.winnersQueue.slice();
        if (this.queue.length == 1) {
          this.last = this.queue.shift();
          return this.resolveTies2();
        }
        this.currentQueue = 'winners';
      }
    }
    this.currentComparison = [this.queue.shift(), this.queue.shift()];
  }

  private resolveTies2(): void {
    // TODO postupovat od winner a robit winnerQueue a zaroven od loser a robit loserQueue
  }

  public addComparisonResultLookingForWinnerAndLoser(winner: Contender<T>, loser: Contender<T>): void {
    this.comparisonCount++;

    if (this.currentQueue == 'start') {
      this.winnersQueue.push(winner);
      this.losersQueue.push(loser);
    } else if (this.currentQueue == 'winners') {
      this.winnersQueue.push(winner);
    } else if (this.currentQueue == 'losers') {
      this.losersQueue.push(loser);
    }

    this.data.find(object => object.id == winner.id).nextBest.push(loser);
    this.nextComparisonLookingForWinnerAndLoser();
  }

  //

  private nextComparison(): void {
    const comparison: [T, T] = this.queue.shift();
    if (!comparison) {
      this.resolveTies(this.renegade);
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

  private createQueue(objects: T[]) {
    this.queue.length = 0;

    let object1: T;
    let object2: T;

    while (objects.length > 0) {
      object1 = objects.shift();
      object2 = objects.shift();
      if (object2) {
        this.queue.push(object1, object2);
      } else {
        this.renegade = object1;
      }
    }
  }

  private resolveTies(winner: T): void {
    this.renegade = null;

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
        this.currentComparison = null;
      }
    }
  }

  public addComparisonResult(winner: T, loser: T): void {
    this.comparisonCount++;
    if (this.renegade) {
      this.queue.push([this.renegade, winner]);
      this.renegade = null;
    } else {
      this.renegade = winner;
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

  public getQueueLength(): number {
    return this.queue?.length;
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
