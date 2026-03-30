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
  private static readonly HYPERLINK_PATTERN: RegExp = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;

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
      id: 'open-note-links',
      tooltip: 'Open Note Links',
      classes: 'fa-solid fa-arrow-up-right-from-square',
      onClick: () => this.openCurrentNoteLinks(),
      hidden: () => !this.stateService.current
    }, {
      id: 'open-settings',
      tooltip: 'Settings',
      classes: 'fa-solid fa-gear',
      onClick: () => this.dialogService.create(ApplicationSettingsComponent)
    }], 'last');
  }

  private openCurrentNoteLinks(): void {
    const links: string[] = this.extractLinks(this.stateService.current?.text);

    links.slice().reverse().forEach(link => window.open(this.normalizeLink(link), '_blank', 'noopener'));
  }

  private extractLinks(text?: string): string[] {
    if (!text) {
      return [];
    }

    const hyperlinkPattern: RegExp = new RegExp(StoryManagerComponent.HYPERLINK_PATTERN);

    return [...new Set(
      Array.from(
        text.matchAll(hyperlinkPattern),
        match => this.trimTrailingPunctuation(match[0])
      ).filter(Boolean)
    )];
  }

  private trimTrailingPunctuation(link: string): string {
    return link.replace(/[.,!?;:)\]}]+$/g, '');
  }

  private normalizeLink(link: string): string {
    return /^https?:\/\//i.test(link) ? link : `https://${link}`;
  }

  protected isMobileView(): boolean {
    return !ScreenUtils.isLargeScreen();
  }

}
