export class Repeater {

  private timeout: number;
  private duration: number;
  private runnable: () => void;

  public constructor(duration?: number) {
    this.timeout = 0;
    this.duration = duration;
  }

  public setDuration(duration: number): this {
    this.duration = duration;
    return this;
  }

  public isRunning(): boolean {
    return this.timeout != 0;
  }

  public toggle(): void {
    this.timeout == 0 ? this.start() : this.stop();
  }

  public start(): void {
    if (this.timeout == 0) {
      this.next();
    }
  }

  public next(): void {
    this.timeout = -1;
    if (this.runnable) {
      this.runnable();
    }

    if (this.timeout == -1) {
      this.timeout = window.setTimeout(() => this.next(), this.duration);
    }
  }

  public stop(): void {
    if (this.timeout != 0) {
      window.clearInterval(this.timeout);
      this.timeout = 0;
    }
  }

  public setRunnable(runnable: () => void): this {
    this.runnable = runnable;
    return this;
  }

}
