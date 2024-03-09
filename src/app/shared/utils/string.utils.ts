export abstract class StringUtils {

  public static format(input: string, ...args: any[]): string {
    do {
      input = input.replace('%s', args.shift() || '');
    } while (input.includes('%s'));

    return input;
  }

  public static capitalize(input: string): string {
    if (!this.isEmpty(input)) {
      return input.substring(0, 1).toUpperCase() + input.substring(1);
    }
  }

  public static isEmpty(input: string): boolean {
    return !input || typeof input != 'string' || input.trim().length <= 0;
  }

  public static getWordCount(input: string): number {
    return input.split(new RegExp('[^ /\n]+', 'g')).length - 1;
  }

}
