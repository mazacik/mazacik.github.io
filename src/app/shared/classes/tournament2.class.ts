import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { Contender } from './contender.class';

export class Tournament2<T> {

  private data: Contender<T>[] = [];

  private currentQueue: 'start' | 'winners' | 'losers' | 'tiebreaker' = 'start';

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
    console.log('queue: ' + this.queue.map(item => item.id));
    console.log('winnersQueue: ' + this.winnersQueue.map(item => item.id));
    console.log('losersQueue: ' + this.losersQueue.map(item => item.id));
    console.log('----------');

    if (this.queue.length < 2) {
      if (this.currentQueue == 'start') {
        const renegade: Contender<T> = this.queue.shift();
        if (renegade) {
          this.winnersQueue.unshift(renegade);
          this.losersQueue.push(renegade);
        }
        this.queue = this.winnersQueue.slice();
        this.winnersQueue.length = 0;
        this.currentQueue = 'winners';
      } else if (this.currentQueue == 'winners') {
        if (this.queue.length == 1) {
          this.winnersQueue.unshift(this.queue[0]);
        }
        this.queue = this.losersQueue.slice();
        this.losersQueue.length = 0;
        this.currentQueue = 'losers';
      } else if (this.currentQueue == 'losers') {
        if (this.queue.length == 1) {
          this.losersQueue.unshift(this.queue[0]);
        }
        this.queue = this.winnersQueue.slice();
        if (this.queue.length == 1) {
          this.first = this.winnersQueue.shift();
          this.last = this.losersQueue.shift();
          this.queue.length = 0;
          this.currentQueue = 'tiebreaker';
          console.log('first: ' + this.first.id);
          console.log('last: ' + this.last.id);
          console.log(this.data);
          console.log('----------');
          return this.resolveTies2();
        }
        this.winnersQueue.length = 0;
        this.currentQueue = 'winners';
      }
    }
    this.currentComparison = [this.queue.shift(), this.queue.shift()];
    this.currentComparison.sort((left, right) => Number.parseInt(left.id) - Number.parseInt(right.id));
    this.addComparisonResult(this.currentComparison[0], this.currentComparison[1]);
  }

  private resolveTies2(): void {
    if (this.queue.length <= 1) {
      for (const item of this.data) {
        if (item.wins.filter(win => !this.queue.includes(win)).length >= 2) {
          console.log('item ' + item.id + ' has wins ' + item.wins.map(z => z.id));
          this.queue.push(item.wins.shift(), item.wins.shift());
        }
      }
      for (const item of this.data) {
        if (item.losses.filter(loss => !this.queue.includes(loss)).length >= 2) {
          console.log('item ' + item.id + ' has losses ' + item.losses.map(z => z.id));
          this.queue.push(item.losses.shift(), item.losses.shift());
        }
      }
    }
    console.log('queue: ' + this.queue.map(item => item.id));
    console.log('----------');
    this.currentComparison = [this.queue.shift(), this.queue.shift()];
  }

  public addComparisonResult(winner: Contender<T>, loser: Contender<T>): void {
    this.comparisonCount++;
    if (this.currentQueue == 'tiebreaker') {

      // 2 > 3

      // 1 > 2 > 4 > 6
      // 1 > 3 > 5 > 6

      ArrayUtils.remove(winner.losses, loser); // jednotke z vyhier zmazat trojku
      ArrayUtils.remove(loser.losses, winner.losses); // trojke z prehier zmazat jednotku

      // 1 > 2 > 4 > 6
      //     3 > 5 > 6

      for (const item of winner.wins) {
        ArrayUtils.remove(item.losses, winner); // stvorke z prehier vymazat dvojku
        ArrayUtils.remove(winner.wins, item); // dvojke z vyhier vymazat stvorku

        // 1 > 2
        //         4 > 6
        //     3 > 5 > 6

        ArrayUtils.push(item.losses, loser); // stvorke do prehier pridat trojku
        ArrayUtils.push(loser.wins, item); // trojke do vyhier pridat stvorku

        // 1 > 2
        //     3 > 4 > 6
        //     3 > 5 > 6
      }

      winner.wins.length = 0;
      winner.wins.push(loser); // dvojke do vyhier pridat trojku
      loser.losses.push(winner); // trojke do prehier pridat dvojku

      // 1 > 2 > 3 > 5 > 6
      // 1 > 2 > 3 > 4 > 6

      console.log(this.data);
      console.log('----------');
      this.resolveTies2();
    } else {
      if (this.currentQueue == 'start') {
        this.winnersQueue.push(winner);
        this.losersQueue.push(loser);
      } else if (this.currentQueue == 'winners') {
        this.winnersQueue.push(winner);
      } else if (this.currentQueue == 'losers') {
        this.losersQueue.push(loser);
      }

      this.data.find(object => object.id == winner.id).wins.push(loser);
      this.data.find(object => object.id == loser.id).losses.push(winner);
      this.nextComparisonLookingForWinnerAndLoser();
    }
  }

  //

  // private nextComparison(): void {
  //   const comparison: [T, T] = this.queue.shift();
  //   if (!comparison) {
  //     this.resolveTies(this.renegade);
  //     return;
  //   }

  //   let autoWinner: T = null;
  //   if (this.getBetterThan(comparison[0]).includes(comparison[1])) {
  //     autoWinner = comparison[0];
  //   } else if (this.getBetterThan(comparison[1]).includes(comparison[0])) {
  //     autoWinner = comparison[1];
  //   }

  //   if (autoWinner) {
  //     if (this.waitingForOpponent) {
  //       this.queue.push([this.waitingForOpponent, autoWinner]);
  //       this.waitingForOpponent = null;
  //     } else {
  //       this.waitingForOpponent = autoWinner;
  //     }

  //     this.nextComparison();
  //   } else {
  //     this.comparison = comparison;
  //     // this.addComparisonResult(this.comparison[0], this.comparison[1]); // AUTO-RESOLVE
  //   }
  // }

  // private createQueue(objects: T[]) {
  //   this.queue.length = 0;

  //   let object1: T;
  //   let object2: T;

  //   while (objects.length > 0) {
  //     object1 = objects.shift();
  //     object2 = objects.shift();
  //     if (object2) {
  //       this.queue.push(object1, object2);
  //     } else {
  //       this.renegade = object1;
  //     }
  //   }
  // }

  // private resolveTies(winner: T): void {
  //   this.renegade = null;

  //   if (winner) {
  //     this.leaderboard.push(winner);

  //     if (this.previousWinner) {
  //       this.directlyBetterThan[this.getKey(this.previousWinner)] = [winner];
  //       this.previousWinner = null;
  //     }

  //     const length: number = this.directlyBetterThan[this.getKey(winner)].length;
  //     if (length > 1) {
  //       this.previousWinner = winner;
  //       this.createQueue(this.directlyBetterThan[this.getKey(winner)]);
  //       // tu urobit viacero paralelnych queues, pre kazdu entitu ktora ma length>1 separatna queue a po kazdom comparison prejst na dalsiu queue, aby sa to tolko neopakovalo
  //       this.nextComparison();
  //     } else if (length == 1) {
  //       this.resolveTies(this.directlyBetterThan[this.getKey(winner)][0]);
  //     } else if (length == 0) {
  //       this.currentComparison = null;
  //     }
  //   }
  // }

  // public addComparisonResult(winner: T, loser: T): void {
  //   this.comparisonCount++;
  //   if (this.renegade) {
  //     this.queue.push([this.renegade, winner]);
  //     this.renegade = null;
  //   } else {
  //     this.renegade = winner;
  //   }

  //   this.directlyBetterThan[this.getKey(winner)].push(loser);
  //   this.nextComparison();
  // }

  // private getBetterThan(image: T, collector: T[] = []): T[] {
  //   for (const _image of this.directlyBetterThan[this.getKey(image)]) {
  //     if (!collector.includes(_image)) {
  //       collector.push(_image);
  //       this.getBetterThan(_image, collector);
  //     }
  //   }
  //   return collector;
  // }

  public getQueueLength(): number {
    return this.queue?.length;
  }

  public reset(): void {
    this.leaderboard.length = 0;
    this.comparisonCount = 0;
    this.data.forEach(item => item.wins.length = 0);
    this.queue = ArrayUtils.shuffle(this.data.slice());
    this.nextComparisonLookingForWinnerAndLoser();
  }

}
