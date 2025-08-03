export abstract class ObjectUtils {

  private constructor() { }

  public static getValueRecursively(object: any, path: string): any;
  public static getValueRecursively(object: any, path: string[]): any;
  public static getValueRecursively(object: any, path: string | string[]): any {
    if (object == null) return;
    if (path == null) return;
    if (typeof path == 'string') path = path.split('.');
    const step: string = path.shift();
    if (path.length == 0) return object[step];
    return ObjectUtils.getValueRecursively(object[step], path);
  }

  public static setValueRecursively(object: any, path: string, value: any): void;
  public static setValueRecursively(object: any, path: string[], value: any): void;
  public static setValueRecursively(object: any, path: string | string[], value: any): void {
    if (object == null) return;
    if (path == null) return;
    if (typeof path == 'string') path = path.split('.');
    const step: string = path.shift();
    if (path.length == 0) return object[step] = value;
    ObjectUtils.setValueRecursively(object[step], path, value);
  }

}
