import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CheckboxComponent } from '../../components/checkbox/checkbox.component';
import { DialogContainerConfiguration } from '../../components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from '../../components/dialog/dialog-content-base.class';
import { ApplicationService, SettingsItem } from '../../services/application.service';

@Component({
  selector: 'app-application-settings',
  standalone: true,
  imports: [
    CommonModule,
    CheckboxComponent
  ],
  templateUrl: './application-settings.component.html',
  styleUrls: ['./application-settings.component.scss']
})
export class ApplicationSettingsComponent extends DialogContentBase<void> {

  public configuration: DialogContainerConfiguration = {
    title: 'Settings',
    buttons: [{
      text: () => 'Close',
      click: () => this.close()
    }],
    hideHeaderCloseButton: true
  };

  public tabs: { id: string; label: string; items: SettingsItem[] }[] = [];
  public activeTabId: string = 'app';

  constructor(
    protected applicationService: ApplicationService
  ) {
    super();
    this.tabs = [
      { id: 'app', label: 'Application', items: this.applicationService.getApplicationSettingsItems() },
      ...this.applicationService.getRegisteredModuleSettings().map(provider => ({
        id: provider.id,
        label: provider.label,
        items: provider.items
      }))
    ];
    this.activeTabId = this.tabs[0]?.id ?? 'app';
  }

  public get activeTab(): { id: string; label: string; items: SettingsItem[] } {
    return this.tabs.find(tab => tab.id === this.activeTabId);
  }

  public close(): void {
    this.resolve();
  }

}
