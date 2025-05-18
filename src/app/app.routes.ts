import { Routes } from '@angular/router';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { ActivityComponent } from './games/activity/activity.component';
import { NikdySomComponent } from './games/nikdy-som/nikdy-som.component';
import { TwisterComponent } from './games/twister/twister.component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { GoogleAuthGuard } from './router/google-auth.guard';
import { HasFolderGuard } from './router/has-folder.guard';
import { NotMessengerBrowserGuard } from './router/not-messenger-browser.guard copy';
import { FuckMessengerBrowserComponent } from './shared/components/fuck-messenger-browser/fuck-messenger-browser.component';
import { StoryManagerComponent } from './story-manager/story-manager.component';

export const routes: Routes = [{
  path: 'messenger-browser',
  canActivate: [NotMessengerBrowserGuard],
  component: FuckMessengerBrowserComponent
}, {
  path: 'login',
  component: LoginComponent
}, {
  path: 'story-manager',
  canActivate: [GoogleAuthGuard],
  component: StoryManagerComponent
}, {
  path: 'folder-picker',
  canActivate: [GoogleAuthGuard],
  component: FolderPickerComponent
}, {
  path: 'gallery',
  canActivate: [GoogleAuthGuard, HasFolderGuard],
  component: GalleryComponent
}, {
  //   path: 'comparison',
  //   component: TournamentComponent
  //   }, {
  //   path: 'event/:id',
  //   component: EventManagerComponent,
  //   children: [{
  //     path: 'hlasovanie/vysledky',
  //     component: SurveyResultsComponent
  //   }, {
  //     path: 'hlasovanie',
  //     canActivate: [MessengerBrowserGuard],
  //     component: SurveyComponent
  //   }, {
  //     path: 'prihlaska',
  //     component: EventApplicationComponent
  //   }, {
  //     path: 'pravidla',
  //     component: RulesComponent
  //   }, {
  //     path: '**',
  //     redirectTo: 'hlasovanie'
  //   }]
  // }, {
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
    path: 'nikdy-som',
    component: NikdySomComponent
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