export abstract class ScreenUtils {

  private constructor() { }

  public static isLargeScreen(): boolean {
    return window.innerWidth > 1000;
  }

  public static isElementVisible(element: HTMLElement, container?: HTMLElement): boolean {
    if (element) {
      const rect: DOMRect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (container ? container.clientHeight : window.innerHeight) &&
        rect.right <= (container ? container.clientWidth : window.innerWidth)
      );
    }
  }

}
