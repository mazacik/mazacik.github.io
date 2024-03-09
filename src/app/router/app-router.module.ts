import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdventureComponent } from '../adventure/adventure.component';
import { FolderPickerComponent } from '../gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from '../gallery/gallery.component';
import { LandingComponent } from '../landing/landing.component';
import { LoginComponent } from '../login/login.component';
import { TournamentComponent } from '../tournament/tournament.component';
import { authenticationGuard } from './authentication.guard';
import { hasFolderGuard } from './has-folder.guard';

const routes: Routes = [{
  path: '',
  component: LandingComponent
}, {
  path: 'login',
  loadChildren: () => import('src/app/login/login.module').then(m => m.LoginModule),
  component: LoginComponent
}, {
  path: 'adventure',
  canMatch: [authenticationGuard],
  loadChildren: () => import('src/app/adventure/adventure.module').then(m => m.AdventureModule),
  component: AdventureComponent
}, {
  path: 'folder-picker',
  canMatch: [authenticationGuard],
  component: FolderPickerComponent
}, {
  path: 'gallery',
  canMatch: [authenticationGuard, hasFolderGuard],
  loadChildren: () => import('src/app/gallery/gallery.module').then(m => m.GalleryModule),
  component: GalleryComponent
}, {
  path: 'tournament',
  loadChildren: () => import('src/app/tournament/tournament.module').then(m => m.TournamentModule),
  component: TournamentComponent
}, {
  path: '**',
  redirectTo: ''
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRouterModule { }