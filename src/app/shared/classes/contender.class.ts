export class Contender<T> {

  public id: string;
  public object: T;
  public wins: Contender<T>[];
  public losses: Contender<T>[];

  constructor(id: string, object: T, wins: Contender<T>[] = [], losses: Contender<T>[] = []) {
    this.id = id;
    this.object = object;
    this.wins = wins;
    this.losses = losses;
  }

}