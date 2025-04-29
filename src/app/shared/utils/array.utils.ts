export abstract class ArrayUtils {

  public static isEmpty(array: any[]): boolean {
    return !array || !Array.isArray(array) || array.length == 0;
  }

  public static includes<T>(array: T[], object: T, matcher?: (t: T) => any): boolean {
    if (!this.isEmpty(array) && object) {
      if (matcher) {
        return array.map(t => matcher(t)).includes(matcher(object));
      } else {
        return array.includes(object);
      }
    }
  }

  public static push<T>(where: T[], what: T | T[]): void {
    if (Array.isArray(where)) {
      if (Array.isArray(what)) {
        for (const _what of what) {
          if (_what !== null && _what !== undefined && !where.includes(_what)) {
            where.push(_what);
          }
        }
      } else {
        if (what !== null && what !== undefined && !where.includes(what)) {
          where.push(what);
        }
      }
    }
  }

  public static remove<T>(where: T[], what: T | T[], matcher?: (t: T) => any): boolean {
    if (!this.isEmpty(where) && what) {
      if (Array.isArray(what)) {
        if (what.length > 0) {
          if (matcher) {
            const _where: any[] = where.map(t => matcher(t));
            for (const _what of what.map(t => matcher(t))) {
              this._remove(where, _what, _where);
            }
          } else {
            for (const _what of what) {
              this._remove(where, _what);
            }
          }
        }
      } else {
        if (matcher) {
          return this._remove(where, matcher(what), where.map(t => matcher(t)));
        } else {
          return this._remove(where, what);
        }
      }
    }
  }

  private static _remove<T>(where: T[], what: T, map?: T[]): boolean {
    if (map) {
      const index: number = map.indexOf(what);
      if (index != -1) {
        map.splice(index, 1);
        return where.splice(index, 1).length > 0 ? true : false;
      }
    } else {
      const index: number = where.indexOf(what);
      if (index != -1) {
        return where.splice(index, 1).length > 0 ? true : false;
      }
    }
  }

  public static toggle<T>(where: T[], what: T): void {
    if (Array.isArray(where)) {
      if (what !== null && what !== undefined) {
        if (where.includes(what)) {
          this._remove(where, what);
        } else {
          where.push(what);
        }
      }
    }
  }

  public static distinct<T>(array: T[], getKey: (t: T) => any): T[] {
    if (!this.isEmpty(array)) {
      const result: T[] = [];
      const map = new Map();
      let key: any;
      for (const item of array) {
        key = getKey(item);
        if (!map.has(key)) {
          map.set(key, true);
          result.push(item);
        }
      }
      return result;
    }
    return [];
  }

  public static getFirst<T>(array: T[]): T {
    if (!this.isEmpty(array)) {
      return array[0];
    }
  }

  public static isFirst<T>(array: T[], object: T): boolean {
    if (!this.isEmpty(array) && object) {
      return object == array[0];
    }
  }

  public static makeFirst<T>(array: T[], object: T): void {
    if (!this.isEmpty(array) && object) {
      this._remove(array, object);
      array.unshift(object);
    }
  }

  public static getLast<T>(array: T[]): T {
    if (!this.isEmpty(array)) {
      return array[array.length - 1];
    }
  }

  public static isLast<T>(array: T[], object: T): boolean {
    if (!this.isEmpty(array) && object) {
      return object == array[array.length - 1];
    }
  }

  public static makeLast<T>(array: T[], object: T): void {
    if (!this.isEmpty(array) && object) {
      this._remove(array, object);
      array.push(object);
    }
  }

  public static getPrevious<T>(array: T[], object: T, loop: boolean = false): T {
    if (!this.isEmpty(array)) {
      return array[array.indexOf(object) - 1] || (loop ? array[array.length - 1] : undefined);
    }
  }

  public static findPrevious<T>(array: T[], start: T, predicate: (t: T) => boolean, loop: boolean = false): T {
    if (!this.isEmpty(array)) {
      const startIndex: number = array.indexOf(start);
      let index: number = startIndex;
      while (index > 0) {
        if (predicate(array[--index])) return array[index];
      }
      if (loop) {
        index = array.length - 1;
        while (index > startIndex) {
          if (predicate(array[--index])) return array[index];
        }
      }
      return undefined;
    }
  }

  public static getNext<T>(array: T[], object: T, loop: boolean = false): T {
    if (!this.isEmpty(array)) {
      return array[array.indexOf(object) + 1] || (loop ? array[0] : undefined);
    }
  }

  public static findNext<T>(array: T[], start: T, predicate: (t: T) => boolean, loop: boolean = false): T {
    if (!this.isEmpty(array)) {
      const startIndex: number = array.indexOf(start);
      let index: number = startIndex;
      while (index < array.length - 1) {
        if (predicate(array[++index])) return array[index];
      }
      if (loop) {
        index = 0;
        while (index < startIndex) {
          if (predicate(array[++index])) return array[index];
        }
      }
      return undefined;
    }
  }

  public static findClosest<T>(array: T[], start: T, predicate?: (t: T) => boolean): T {
    if (!this.isEmpty(array)) {
      const startIndex: number = array.indexOf(start);
      let indexOffset: number = 0;
      let element: T;
      let goLeft: boolean = true;
      let goRight: boolean = true;
      while (goLeft || goRight) {
        indexOffset++;
        if (goRight) {
          element = array[startIndex + indexOffset];
          if (!element) goRight = false;
          if (element && (!predicate || predicate(element))) return element;
        }
        if (goLeft) {
          element = array[startIndex - indexOffset];
          if (!element) goLeft = false;
          if (element && (!predicate || predicate(element))) return element;
        }
      }
      return undefined;
    }
  }

  public static getRandom<T>(array: T[], except?: T[]): T {
    if (this.isEmpty(array)) return null;
    if (array.length == 1) return array[0];
    array = array.slice();
    this.remove(array, except);
    return array[Math.floor(Math.random() * array.length)];
  }

  public static nearestRightFirst<T>(array: T[], startIndex: number, callback?: (t: T) => boolean): T {
    if (startIndex + 1 < array.length) {
      for (let i = startIndex + 1; i < array.length; i++) {
        if (!callback || callback(array[i])) return array[i];
      }
    }

    if (startIndex > 0) {
      for (let i = startIndex - 1; i > -1; i--) {
        if (!callback || callback(array[i])) return array[i];
      }
    }

    return null;
  }

  public static shuffle<T>(array: T[]): T[] {
    let currentIndex: number = array.length;
    let randomIndex: number;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  }

}
