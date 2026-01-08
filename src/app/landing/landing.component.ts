import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppConstants } from '../shared/constants/app.constants';
import { ApplicationSettingsComponent } from '../shared/dialogs/application-settings/application-settings.component';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';

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
export class LandingComponent implements OnInit {

  protected apps: ApplicationConfig[] = [{
    id: 'gallery',
    label: 'Gallery'
  }, {
    id: 'story-manager',
    label: 'Notes'
  }, {
    id: 'shopping-list',
    label: 'Shopping List'
  }];

  constructor(
    private router: Router,
    private applicationService: ApplicationService,
    private dialogService: DialogService
  ) {
    this.applicationService.loading.set(false);
  }

  ngOnInit(): void {
    this.configureHeader();
  }

  protected navigate(app: ApplicationConfig): void {
    sessionStorage.setItem(AppConstants.KEY_ACTIVE_APP_ID, app.id);
    sessionStorage.removeItem(AppConstants.KEY_GOOGLE_DATA_FILE_ID);
    this.router.navigate([app.id]);
  }

  private configureHeader(): void {
    this.applicationService.addHeaderButtons('end', [{
      id: 'open-settings',
      tooltip: 'Settings',
      classes: ['fa-solid', 'fa-gear'],
      onClick: () => this.dialogService.create(ApplicationSettingsComponent)
    }], 'last');
  }

}
