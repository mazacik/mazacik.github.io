import { Routes } from '@angular/router';
import { AdventureComponent } from './adventure/adventure.component';
import { EventApplicationComponent } from './event-manager/event-application/event-application.component';
import { EventManagerComponent } from './event-manager/event-manager.component';
import { RulesComponent } from './event-manager/rules/rules.component';
import { SurveyResultsComponent } from './event-manager/survey-results/survey-results.component';
import { SurveyComponent } from './event-manager/survey/survey.component';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { TwisterComponent } from './games/twister/twister.component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { GoogleAuthGuard } from './router/google-auth.guard';
import { HasFolderGuard } from './router/has-folder.guard';
import { MessengerBrowserGuard } from './router/messenger-browser.guard';
import { NotMessengerBrowserGuard } from './router/not-messenger-browser.guard copy';
import { FuckMessengerBrowserComponent } from './shared/components/fuck-messenger-browser/fuck-messenger-browser.component';
import { TournamentComponent } from './tournament/tournament.component';
import { ActivityComponent } from './games/activity/activity.component';

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
  component: EventManagerComponent,
  children: [{
    path: 'hlasovanie/vysledky',
    component: SurveyResultsComponent
  }, {
    path: 'hlasovanie',
    canActivate: [MessengerBrowserGuard],
    component: SurveyComponent
  }, {
    path: 'prihlaska',
    component: EventApplicationComponent
  }, {
    path: 'pravidla',
    component: RulesComponent
  }, {
    path: '**',
    redirectTo: 'hlasovanie'
  }]
}, {
  path: 'home',
  component: LandingComponent
}, {
  path: 'games',
  children: [{
    path: 'activity',
    component: ActivityComponent
  }, {
    path: 'twister',
    component: TwisterComponent
  }, {
    path: '**',
    redirectTo: '/'
  }]
}, {
  path: '**',
  redirectTo: 'home'
}];

// {
//   path: '',
//   component: LandingComponent
// }, 