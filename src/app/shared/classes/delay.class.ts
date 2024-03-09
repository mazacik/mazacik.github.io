export class Delay {

  private length: number;
  private maxLength: number;
  private timeout: number;
  private maxLengthTimeout: number;
  private runnable: () => void;

  public constructor(length: number, maxLength?: number) {
    this.length = length;
    if (maxLength && maxLength > length) this.maxLength = maxLength;
  }

  public restart(runnable?: () => void): void {
    clearTimeout(this.timeout);
    this.runnable = runnable;

    this.timeout = setTimeout(() => {
      if (runnable) runnable();
      this.timeout = null;
      if (this.maxLengthTimeout) {
        clearTimeout(this.maxLengthTimeout);
        this.maxLengthTimeout = null;
      }
    }, this.length) as unknown as number;

    if (this.maxLength && !this.maxLengthTimeout) {
      this.maxLengthTimeout = setTimeout(() => {
        if (runnable) runnable();
        this.maxLengthTimeout = null;
        clearTimeout(this.timeout);
        this.timeout = null;
      }, this.maxLength) as unknown as number;
    }
  }

  public stop(): void {
    clearTimeout(this.timeout);
    this.timeout = null;
    clearTimeout(this.maxLengthTimeout);
    this.maxLengthTimeout = null;
  }

  public complete(): void {
    this.stop();
    if (this.runnable) this.runnable();
  }

  public isActive(): boolean {
    return this.timeout != null;
  }

}