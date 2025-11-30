import { Component, effect, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './gallery/components/header/header.component';
import { Delay } from './shared/classes/delay.class';
import { ApplicationSettingsComponent } from './shared/dialogs/application-settings/application-settings.component';
import { ApplicationService } from './shared/services/application.service';
import { DialogService } from './shared/services/dialog.service';
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
    protected applicationService: ApplicationService,
    protected dialogService: DialogService
  ) {
    effect(() => {
      if (this.applicationService.changes() !== undefined) {
        this.hideLoadingBarDelay.restart();
      }
    });

    this.applicationService.setPersistentHeader({
      end: [{
        id: 'toggle-theme',
        tooltip: 'Toggle Theme',
        classes: () => ['fa-solid', this.applicationService.isDarkTheme() ? 'fa-moon' : 'fa-sun'],
        onClick: () => this.applicationService.toggleTheme()
      }, {
        id: 'open-settings',
        tooltip: 'Settings',
        classes: ['fa-solid', 'fa-gear'],
        onClick: () => this.dialogService.create(ApplicationSettingsComponent)
      }]
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
