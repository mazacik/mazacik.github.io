import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppConstants } from '../shared/constants/app.constants';
import { ApplicationService } from '../shared/services/application.service';

interface ApplicationConfig {
  id: string;
  label: string;
}

@Component({
  selector: 'app-landing',
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {

  protected apps: ApplicationConfig[] = [{
    id: 'gallery',
    label: 'Gallery'
  }, {
    id: 'story-manager',
    label: 'Story Manager'
  }];

  constructor(
    private router: Router,
    private applicationService: ApplicationService
  ) {
    this.applicationService.loading.set(false);
  }

  protected navigate(app: ApplicationConfig): void {
    sessionStorage.setItem(AppConstants.KEY_ACTIVE_APP_ID, app.id);
    sessionStorage.removeItem(AppConstants.KEY_GOOGLE_DATA_FILE_ID);
    this.router.navigate([app.id]);
  }

}
