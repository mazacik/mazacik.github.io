import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AdventureComponent } from './adventure/adventure.component';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { AuthenticationGuard } from './router/authentication.guard';
import { hasFolderGuard } from './router/has-folder.guard';
import { TournamentComponent } from './tournament/tournament.component';

export const routes: Routes = [{
  path: '',
  component: LandingComponent
}, {
  path: 'login',
  component: LoginComponent
}, {
  path: 'adventure',
  canActivate: [() => inject(AuthenticationGuard).canActivate()],
  component: AdventureComponent
}, {
  path: 'folder-picker',
  canActivate: [],
  canMatch: [() => inject(AuthenticationGuard).canActivate()],
  component: FolderPickerComponent
}, {
  path: 'gallery',
  canMatch: [() => inject(AuthenticationGuard).canActivate(), hasFolderGuard],
  component: GalleryComponent
}, {
  path: 'tournament',
  component: TournamentComponent
}, {
  path: '**',
  redirectTo: ''
}];
