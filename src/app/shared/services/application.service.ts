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
      document.body.style.colorScheme = 'dark';
    } else {
      document.body.classList.add('light-theme');
      document.body.style.colorScheme = 'light';
    }
  }

  public isDarkTheme(): boolean {
    return this.darkTheme;
  }

  public toggleTheme(): void {
    if (this.darkTheme) {
      this.darkTheme = false;
      document.body.classList.toggle('dark-theme', false);
      document.body.classList.toggle('light-theme', true);
      document.body.style.colorScheme = 'light';
    } else {
      this.darkTheme = true;
      document.body.classList.toggle('dark-theme', true);
      document.body.classList.toggle('light-theme', false);
      document.body.style.colorScheme = 'dark';
    }
  }

  public get reduceBandwidth(): boolean {
    return window.localStorage.getItem('REDUCE_BANDWIDTH') == '1';
  }

  public set reduceBandwidth(reduceBandwidth: boolean) {
    window.localStorage.setItem('REDUCE_BANDWIDTH', reduceBandwidth ? '1' : '0');
  }

}
