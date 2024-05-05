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

  public static difference<T>(array1: T[], array2: T[], equal: (t1: T, t2: T) => boolean): T[] {
    if (!this.isEmpty(array1) && !this.isEmpty(array2)) {
      const result: T[] = [];
      for (const item1 of array1) {
        if (!array2.some(item2 => equal(item1, item2))) {
          result.push(item1);
        }
      }
      return result;
    }
    return [];
  }

  public static unique<T>(array: T[], getKey: (t: T) => any): T[] {
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
