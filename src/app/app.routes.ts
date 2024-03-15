import { Routes } from '@angular/router';
import { AdventureComponent } from './adventure/adventure.component';
import { EventManagerComponent } from './event-manager/event-manager.component';
import { SurveyResultsComponent } from './event-manager/results/survey-results.component';
import { RulesComponent } from './event-manager/rules/rules.component';
import { SurveyComponent } from './event-manager/survey/survey.component';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LoginComponent } from './login/login.component';
import { GoogleAuthGuard } from './router/google-auth.guard';
import { HasFolderGuard } from './router/has-folder.guard';
import { MessengerBrowserGuard } from './router/messenger-browser.guard';
import { NotMessengerBrowserGuard } from './router/not-messenger-browser.guard copy';
import { FuckMessengerBrowserComponent } from './shared/components/fuck-messenger-browser/fuck-messenger-browser.component';
import { TournamentComponent } from './tournament/tournament.component';

export const routes: Routes = [{
  path: 'messenger-browser',
  canActivate: [NotMessengerBrowserGuard],
  component: FuckMessengerBrowserComponent
}, {
  path: 'login',
  component: LoginComponent
}, {
  path: 'adventure',
  canActivate: [GoogleAuthGuard],
  component: AdventureComponent
}, {
  path: 'folder-picker',
  canActivate: [GoogleAuthGuard],
  component: FolderPickerComponent
}, {
  path: 'gallery',
  canActivate: [GoogleAuthGuard, HasFolderGuard],
  component: GalleryComponent
}, {
  path: 'tournament',
  component: TournamentComponent
}, {
  path: 'event/:id',
  canActivate: [MessengerBrowserGuard],
  component: EventManagerComponent,
  children: [{
    path: 'hlasovanie/vysledky',
    component: SurveyResultsComponent
  }, {
    path: 'hlasovanie',
    component: SurveyComponent
  }, {
    path: 'pravidla',
    component: RulesComponent
  }, {
    path: '**',
    redirectTo: 'hlasovanie'
  }]
}, {
  path: '**',
  redirectTo: 'event/2024-splav'
}];

// {
//   path: '',
//   component: LandingComponent
// }, 