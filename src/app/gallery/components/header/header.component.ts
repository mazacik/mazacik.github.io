import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { ApplicationService, HeaderAction, HeaderClasses, HeaderConfig } from 'src/app/shared/services/application.service';

@Component({
  selector: 'app-header',
  imports: [
    NgClass
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  protected headerConfig = this.applicationService.header;

  constructor(
    protected applicationService: ApplicationService
  ) { }

  protected resolveClasses(classes?: HeaderClasses | (() => HeaderClasses)): HeaderClasses | undefined {
    if (!classes) {
      return undefined;
    }
    return typeof classes === 'function' ? classes() : classes;
  }

  protected isHidden(action: HeaderAction): boolean {
    const hidden = action.hidden;
    return typeof hidden === 'function' ? hidden() : !!hidden;
  }

  protected trackById(_index: number, action: HeaderAction): string {
    return action.id;
  }

}
