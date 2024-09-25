export class Contender<T> {

  public id: string;
  public object: T;
  public nextBest: Contender<T>[];

  constructor(id: string, object: T, nextBest: Contender<T>[] = []) {
    this.id = id;
    this.object = object;
    this.nextBest = nextBest;
  }

}