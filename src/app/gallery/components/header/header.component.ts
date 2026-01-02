import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { ApplicationService, HeaderAction, HeaderClasses } from 'src/app/shared/services/application.service';

@Component({
  selector: 'app-header',
  imports: [
    NgClass
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor(
    protected applicationService: ApplicationService
  ) { }

  protected resolveClasses(classes?: HeaderClasses | (() => HeaderClasses)): HeaderClasses | undefined {
    if (!classes) {
      return undefined;
    }
    return typeof classes === 'function' ? classes() : classes;
  }

  protected isDisabled(action: HeaderAction): boolean {
    const disabled = action.disabled;
    return typeof disabled === 'function' ? disabled() : !!disabled;
  }

  protected isHidden(action: HeaderAction): boolean {
    const hidden = action.hidden;
    return typeof hidden === 'function' ? hidden() : !!hidden;
  }

  protected getTooltip(action: HeaderAction): string {
    const tooltip = action.tooltip;
    return typeof tooltip === 'function' ? tooltip() : tooltip;
  }

  protected onClick(action: HeaderAction): void {
    if (action.onClick && !this.isDisabled(action) && !this.isHidden(action)) action.onClick();
  }

}
