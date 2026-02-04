import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationSettingsComponent } from '../shared/dialogs/application-settings/application-settings.component';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { ScreenUtils } from '../shared/utils/screen.utils';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { StoryManagerStateService } from './services/story-manager-state.service';

@Component({
  selector: 'app-story-manager',
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent
  ],
  templateUrl: './story-manager.component.html',
  styleUrls: ['./story-manager.component.scss']
})
export class StoryManagerComponent implements OnInit {

  constructor(
    protected stateService: StoryManagerStateService,
    private applicationService: ApplicationService,
    private dialogService: DialogService
  ) { }

  ngOnInit(): void {
    this.configureHeader();
  }

  private configureHeader(): void {
    this.applicationService.addHeaderButtons('start', [{
      id: 'show-sidebar',
      tooltip: 'Show Notes',
      classes: 'fa-solid fa-angle-left mobile-only',
      onClick: () => this.stateService.current = null,
      hidden: () => !this.stateService.current
    }], 'first');

    this.applicationService.addHeaderButtons('end', [{
      id: 'open-settings',
      tooltip: 'Settings',
      classes: 'fa-solid fa-gear',
      onClick: () => this.dialogService.create(ApplicationSettingsComponent)
    }], 'last');
  }

  protected isMobileView(): boolean {
    return !ScreenUtils.isLargeScreen();
  }

}
