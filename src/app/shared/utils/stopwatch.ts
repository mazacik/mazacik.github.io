export abstract class Stopwatch {

  private static time: number = Date.now();

  public static click(): void {
    const now: number = Date.now();
    console.log(now - this.time);
    this.time = now;
  }

}