import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { TournamentUtils } from '../utils/tournament.utils';
import { Contender } from './contender.class';

export class Tournament<T> {

  public contenders: Contender<T>[] = [];

  private queue: Contender<T>[] = [];
  private winnersQueue: Contender<T>[] = [];
  private losersQueue: Contender<T>[] = [];

  private currentQueueType: 'start' | 'winners' | 'losers' | 'tiebreaker';

  public currentComparison: [Contender<T>, Contender<T>];
  public leaderboard: Contender<T>[] = [];

  private first: Contender<T> = null;

  private resolvingTiesFor: Contender<T> = null;
  private history: Contender<T>[] = [];
  private maxHistoryLength: number;

  constructor(input: T[], getId: (object: T) => string, directlyBetterData?: { [key: string]: string[] }) {
    this.contenders = input.map(item => new Contender<T>(getId(item), item));
    this.maxHistoryLength = Math.min(10, Math.round(this.contenders.length / 4));

    if (directlyBetterData && Object.keys(directlyBetterData).length > 0) {
      for (const item of this.contenders) {
        item.directlyBetterThan = directlyBetterData[item.id]?.map(id => this.contenders.find(item => item.id == id)) || [];
      }
    }

    this.first = TournamentUtils.getFirst(this.contenders);
    if (this.first) {
      this.currentQueueType = 'tiebreaker';
    } else {
      this.currentQueueType = 'start';
      this.queue = this.contenders.slice();
    }

    this.leaderboard = TournamentUtils.getLeaderboard(this.first, this.contenders);
    this.nextComparison();
  }

  private nextComparison(): void {
    switch (this.currentQueueType) {
      case 'start':
      case 'winners':
      case 'losers':
        this.nextComparisonUntilFirst();
        break;
      case 'tiebreaker':
        this.nextComparisonTiebreaker();
        break;
    }
  }

  private nextComparisonUntilFirst(): void {
    const left = this.queue.shift();
    const right = this.queue.shift();

    if (left.isBetterThan(right)) {
      this.handleUserInput(left, right);
    } else if (right.isBetterThan(left)) {
      this.handleUserInput(right, left);
    } else {
      this.currentComparison = [left, right];
      this.leaderboard = TournamentUtils.getLeaderboard(this.first, this.contenders);
    }

    // AUTO-COMPARE
    // this.currentComparison.sort((left, right) => Number.parseInt(left.id) - Number.parseInt(right.id));
    // this.handleUserDecision(this.currentComparison[0], this.currentComparison[1]);
  }

  private nextComparisonTiebreaker(): void {
    this.resolvingTiesFor = null;
    this.history.length = Math.min(this.history.length, this.maxHistoryLength);
    const history: Contender<T>[] = this.history.slice();

    let mostWinsCount: number = 1;
    let mostWinsArray: Contender<T>[];
    let availableForComparison: Contender<T>[];
    do {
      for (const item of this.contenders) {
        availableForComparison = item.directlyBetterThan.filter(win => !history.includes(win));
        if (availableForComparison.length > mostWinsCount) {
          mostWinsCount = availableForComparison.length;
          mostWinsArray = availableForComparison;
          this.resolvingTiesFor = item;
        }
      }
      if (history.length == 0) break;
      history.length = history.length - 2;
    } while (this.resolvingTiesFor == null);

    if (this.resolvingTiesFor) {
      const left: Contender<T> = mostWinsArray[0];
      const right: Contender<T> = mostWinsArray[1];

      if (left.isBetterThan(right)) {
        ArrayUtils.remove(this.resolvingTiesFor.directlyBetterThan, right);
        ArrayUtils.push(left.directlyBetterThan, right);
        this.nextComparison();
      } else if (right.isBetterThan(left)) {
        ArrayUtils.remove(this.resolvingTiesFor.directlyBetterThan, left);
        ArrayUtils.push(right.directlyBetterThan, left);
        this.nextComparison();
      } else {
        this.currentComparison = [left, right];
        this.history.unshift(left, right);
        this.leaderboard = TournamentUtils.getLeaderboard(this.first, this.contenders);
      }
    } else {
      this.currentComparison = null;
    }
  }

  public handleUserInput(winner: Contender<T>, loser: Contender<T>): void {
    switch (this.currentQueueType) {
      case 'start':
        ArrayUtils.push(this.winnersQueue, winner);
        ArrayUtils.push(this.losersQueue, loser);
        ArrayUtils.push(winner.directlyBetterThan, loser);
        if (this.queue.length <= 1) {
          const renegade: Contender<T> = this.queue.shift();
          if (renegade) this.winnersQueue.unshift(renegade);
          this.queue = this.winnersQueue.slice();
          this.winnersQueue.length = 0;
          this.currentQueueType = 'winners';
        }
        break;
      case 'winners':
        ArrayUtils.push(this.winnersQueue, winner);
        ArrayUtils.push(winner.directlyBetterThan, loser);
        if (this.queue.length <= 1) {
          if (this.queue.length == 1) {
            this.winnersQueue.unshift(this.queue[0]);
          }
          this.queue = this.losersQueue.slice();
          this.losersQueue.length = 0;
          this.currentQueueType = 'losers';
        }
        break;
      case 'losers':
        ArrayUtils.push(this.losersQueue, loser);
        ArrayUtils.push(winner.directlyBetterThan, loser);
        if (this.queue.length <= 1) {
          if (this.queue.length == 1) {
            this.losersQueue.unshift(this.queue[0]);
          }
          this.queue = this.winnersQueue.slice();
          if (this.queue.length == 1) {
            this.first = this.winnersQueue.shift();
            console.log(this.first);
            this.queue.length = 0;
            this.currentQueueType = 'tiebreaker';
          } else {
            this.winnersQueue.length = 0;
            this.currentQueueType = 'winners';
          }
        }
        break;
      case 'tiebreaker':
        ArrayUtils.remove(this.resolvingTiesFor.directlyBetterThan, loser);
        ArrayUtils.push(winner.directlyBetterThan, loser);
        break;
    }

    this.contenders.forEach(item => item.clearBetterThan());
    this.nextComparison();
  }

  public reset(): void {
    this.first = null;
    this.currentQueueType = 'start';
    this.leaderboard = this.contenders.slice();
    this.contenders.forEach(item => item.directlyBetterThan.length = 0);
    this.queue = this.contenders.slice();
    this.nextComparison();
  }

}
