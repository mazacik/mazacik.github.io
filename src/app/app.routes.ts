import { Routes } from '@angular/router';
import { AdventureComponent } from './adventure/adventure.component';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LoginComponent } from './login/login.component';
import { RaftingComponent } from './rafting/rafting.component';
import { AuthenticationGuard } from './router/authentication.guard';
import { HasFolderGuard } from './router/has-folder.guard';
import { TournamentComponent } from './tournament/tournament.component';
import { PollsComponent } from './rafting/polls/polls.component';

export const routes: Routes = [{
  path: 'login',
  component: LoginComponent
}, {
  path: 'adventure',
  canActivate: [AuthenticationGuard],
  component: AdventureComponent
}, {
  path: 'folder-picker',
  canActivate: [AuthenticationGuard],
  component: FolderPickerComponent
}, {
  path: 'gallery',
  canActivate: [AuthenticationGuard, HasFolderGuard],
  component: GalleryComponent
}, {
  path: 'tournament',
  component: TournamentComponent
}, {
  path: 'splav',
  component: RaftingComponent,
  children: [{
    path: 'polls',
    component: PollsComponent
  }]
}, {
  path: '**',
  redirectTo: ''
}];

// {
//   path: '',
//   component: LandingComponent
// }, 