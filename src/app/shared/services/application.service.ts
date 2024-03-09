import { Injectable } from "@angular/core";
import { SmartBehaviorSubject } from "../classes/smart-behavior-subject.class";

@Injectable({
  providedIn: 'root',
})
export class ApplicationService {
  // TODO rename to StateService, make GalleryStateService extend it?

  private darkTheme: boolean = true;

  // TODO signals instead of SBS
  public loading: SmartBehaviorSubject<boolean> = new SmartBehaviorSubject(false);
  public changes: SmartBehaviorSubject<boolean> = new SmartBehaviorSubject(false);
  public errors: SmartBehaviorSubject<boolean> = new SmartBehaviorSubject(false);

  public initTheme(): void {
    if (this.darkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }

  public isDarkTheme(): boolean {
    return this.darkTheme;
  }

  public toggleTheme(): void {
    this.darkTheme = !this.darkTheme;
    document.body.classList.toggle('light-theme', !this.darkTheme);
    document.body.classList.toggle('dark-theme', this.darkTheme);
  }

  public get reduceBandwidth(): boolean {
    return window.localStorage.getItem('REDUCE_BANDWIDTH') == '1';
  }

  public set reduceBandwidth(reduceBandwidth: boolean) {
    window.localStorage.setItem('REDUCE_BANDWIDTH', reduceBandwidth ? '1' : '0');
  }

}
