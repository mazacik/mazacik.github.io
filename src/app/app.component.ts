import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Delay } from './shared/classes/delay.class';
import { fade } from './shared/consntants/animations.constants';
import { ApplicationService } from './shared/services/application.service';
import { DialogService } from './shared/services/dialog.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [fade]
})
export class AppComponent {

  private hideLoadingBarDelay: Delay = new Delay(1500);

  constructor(
    protected applicationService: ApplicationService,
    protected dialogService: DialogService
  ) {
    this.applicationService.initTheme();
    this.applicationService.changes.subscribe(changes => {
      if (changes === false) {
        this.hideLoadingBarDelay.restart();
      }
    });
  }

  protected isBlurOverlayVisible(): boolean {
    return this.applicationService.loading.value || this.dialogService.getCount() != 0;
  }

  protected getLoadingBarColor(): string {
    if (this.applicationService.changes.value) {
      return 'orange';
    } else if (this.applicationService.errors.value) {
      return 'red';
    } else if (this.hideLoadingBarDelay.isActive()) {
      return 'limegreen';
    } else return 'transparent';
  }

}
