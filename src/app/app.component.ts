import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Delay } from './shared/classes/delay.class';
import { fade } from './shared/constants/animations.constants';
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
    effect(() => {
      if (this.applicationService.changes() !== undefined) {
        this.hideLoadingBarDelay.restart();
      }
    });
  }

  protected isBlurOverlayVisible(): boolean {
    return this.applicationService.loading();
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

}
