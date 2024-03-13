import { Routes } from '@angular/router';
import { AdventureComponent } from './adventure/adventure.component';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LoginComponent } from './login/login.component';
import { RaftingComponent } from './rafting/rafting.component';
import { SurveyResultsComponent } from './rafting/results/survey-results.component';
import { SurveyComponent } from './rafting/survey/survey.component';
import { GoogleAuthGuard } from './router/google-auth.guard';
import { HasFolderGuard } from './router/has-folder.guard';
import { TournamentComponent } from './tournament/tournament.component';

export const routes: Routes = [{
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
  path: 'splav-2024',
  component: RaftingComponent,
  children: [{
    path: 'hlasovanie/vysledky',
    component: SurveyResultsComponent
  }, {
    path: 'hlasovanie',
    component: SurveyComponent
  }]
}, {
  path: '**',
  redirectTo: ''
}];

// {
//   path: '',
//   component: LandingComponent
// }, 