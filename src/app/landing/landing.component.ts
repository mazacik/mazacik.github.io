import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppConstants } from '../shared/constants/app.constants';
import { ApplicationSettingsComponent } from '../shared/dialogs/application-settings/application-settings.component';
import { ApplicationService } from '../shared/services/application.service';
import { AuthenticationService } from '../shared/services/authentication.serivce';
import { DialogService } from '../shared/services/dialog.service';

interface ApplicationConfig {
  id: string;
  label: string;
  requiresGoogleAuthentication?: boolean;
}

@Component({
  selector: 'app-landing',
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {

  protected apps: ApplicationConfig[] = [{
    id: 'gallery',
    label: 'Gallery',
    requiresGoogleAuthentication: true
  }, {
    id: 'story-manager',
    label: 'Notes',
    requiresGoogleAuthentication: true
  }, {
    id: 'shopping-list',
    label: 'Shopping List'
  }];

  protected googleAuthenticated: boolean = false;
  protected checkingGoogleAuthentication: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private applicationService: ApplicationService,
    protected authenticationService: AuthenticationService,
    private dialogService: DialogService
  ) {
    this.applicationService.loading.set(false);
  }

  ngOnInit(): void {
    this.configureHeader();
    this.initializeGoogleAuthentication();
  }

  protected get visibleApps(): ApplicationConfig[] {
    return this.apps.filter(app => this.googleAuthenticated || !app.requiresGoogleAuthentication);
  }

  protected navigate(app: ApplicationConfig): void {
    sessionStorage.setItem(AppConstants.KEY_ACTIVE_APP_ID, app.id);
    sessionStorage.removeItem(AppConstants.KEY_GOOGLE_DATA_FILE_ID);
    this.applicationService.loading.set(true);
    this.router.navigate([app.id]);
  }

  private async initializeGoogleAuthentication(): Promise<void> {
    const code: string = this.route.snapshot.queryParams['code'];
    if (code) {
      this.applicationService.loading.set(true);
      await this.authenticationService.requestTokens(code);
      this.applicationService.loading.set(false);
      this.router.navigate(['']);
      return;
    }

    if (this.authenticationService.getAccessToken()) {
      this.googleAuthenticated = true;
    } else if (this.authenticationService.getRefreshToken()) {
      this.googleAuthenticated = !!await this.authenticationService.requestAccessToken();
    }

    this.checkingGoogleAuthentication = false;
  }

  private configureHeader(): void {
    this.applicationService.addHeaderButtons('end', [{
      id: 'open-settings',
      tooltip: 'Settings',
      classes: 'fa-solid fa-gear',
      onClick: () => this.dialogService.create(ApplicationSettingsComponent)
    }], 'last');
  }

}
