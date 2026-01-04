import { Component, effect, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './gallery/components/header/header.component';
import { Delay } from './shared/classes/delay.class';
import { ApplicationService } from './shared/services/application.service';
import { KeyboardShortcutService } from './shared/services/keyboard-shortcut.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  private hideLoadingBarDelay: Delay = new Delay(1500);

  constructor(
    private keyboardShortcutService: KeyboardShortcutService,
    protected applicationService: ApplicationService
  ) {
    effect(() => {
      if (this.applicationService.changes() !== undefined) {
        this.hideLoadingBarDelay.restart();
      }
    });
  }

  protected getLoadingBarColor(): string {
    if (this.applicationService.changes()) {
      return 'orange';
    } else if (this.applicationService.errors()) {
      return 'red';
    } else if (this.hideLoadingBarDelay.isActive()) {
      return 'limegreen';
    } else return 'transparent';
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.keyboardShortcutService.next(event);
  }

}
