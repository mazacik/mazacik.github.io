import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { CheckboxComponent } from '../../components/checkbox/checkbox.component';
import { DialogContainerConfiguration } from '../../components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from '../../components/dialog/dialog-content-base.class';
import { AppConstants } from '../../constants/app.constants';
import { ApplicationService, ModuleSettingsProvider } from '../../services/application.service';
import { ScreenUtils } from '../../utils/screen.utils';

@Component({
  selector: 'app-application-settings',
  standalone: true,
  imports: [
    CommonModule,
    CheckboxComponent
  ],
  templateUrl: './application-settings.component.html',
  styleUrls: ['./application-settings.component.scss'],
  host: { '(window:resize)': 'updateMobileSettingsState()' }
})
export class ApplicationSettingsComponent extends DialogContentBase<void> implements OnDestroy {

  public configuration: DialogContainerConfiguration = {
    title: 'Settings',
    headerButtons: [{
      iconClass: 'fa-solid fa-times',
      click: () => this.close()
    }],
    footerButtons: [{
      text: 'Close',
      click: () => this.close()
    }]
  };

  public tabs: ModuleSettingsProvider[] = [];
  public activeTabId: string;

  constructor(
    protected applicationService: ApplicationService
  ) {
    super();
    this.updateMobileSettingsState();
    const applicationSettings = this.applicationService.getApplicationSettings();
    this.tabs = [
      applicationSettings,
      ...this.applicationService.getRegisteredModuleSettings()
    ];
    this.activeTabId = sessionStorage.getItem(AppConstants.KEY_SETTINGS_ACTIVE_TAB) ?? applicationSettings.id;
  }

  protected updateMobileSettingsState(): void {
    this.applicationService.mobileSettingsOpen.set(!ScreenUtils.isLargeScreen());
  }

  ngOnDestroy(): void {
    this.applicationService.mobileSettingsOpen.set(false);
  }

  public get activeTab(): ModuleSettingsProvider | undefined {
    return this.tabs.find(tab => tab.id === this.activeTabId);
  }

  public setActiveTabId(activeTabId: string): void {
    this.activeTabId = activeTabId;
    sessionStorage.setItem(AppConstants.KEY_SETTINGS_ACTIVE_TAB, activeTabId);
  }

  public close(): void {
    this.resolve();
  }

}
