import { Routes } from '@angular/router';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { GoogleAuthGuard } from './router/google-auth.guard';
import { HasFolderGuard } from './router/has-folder.guard';
import { StoryManagerComponent } from './story-manager/story-manager.component';

export const routes: Routes = [{
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
  path: '**',
  component: LandingComponent
}];

// {
//   path: 'messenger-browser',
//   canActivate: [NotMessengerBrowserGuard],
//   component: FuckMessengerBrowserComponent
// },

// }, {
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
//   path: 'games',
//   children: [{
//     path: 'activity',
//     component: ActivityComponent
//   }, {
//     path: 'twister',
//     component: TwisterComponent
//   }, {
//     path: 'nikdy-som',
//     component: NikdySomComponent
//   }, {
//     path: '**',
//     redirectTo: '/'
//   }]
