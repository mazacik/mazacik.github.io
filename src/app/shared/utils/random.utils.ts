export abstract class RandomUtils {

  public static random(max: number): number;
  public static random(min: number, max: number): number;
  public static random(arg1: number, arg2?: number): number {
    return Math.random() * (arg2 ? arg2 - arg1 : arg1) + (arg2 ? arg1 : 0);
  }

  public static from<T>(array: T[], except?: T | T[]): T {
    if (except) {
      if (Array.isArray(except)) {
        array = array.filter(object => !except.includes(object));
      } else {
        array = array.filter(object => object != except);
      }
    }

    return array[Math.floor(this.random(array.length))];
  }

  public static percentage(n: number): boolean {
    return Math.random() < n / 100;
  }

  public static oneIn(n: number): boolean {
    return Math.random() < 1 / n;
  }

  public static color(): string {
    let h: number = (Math.random() + 0.618033988749895) % 1;
    let s: number = this.random(0.4, 0.6);
    let v: number = 0.95;
    let i: number = Math.floor(h * 6);
    let f: number = h * 6 - i;
    let p: number = v * (1 - s);
    let q: number = v * (1 - f * s);
    let t: number = v * (1 - (1 - f) * s);
    let r: number;
    let g: number;
    let b: number;

    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }

    return "#" + Math.round(r * 255).toString(16) as string + Math.round(g * 255).toString(16) + Math.round(b * 255).toString(16);
  }

}
