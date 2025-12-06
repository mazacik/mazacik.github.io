import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, Routes } from '@angular/router';
import { ImageComparisonComponent } from './gallery/dialogs/image-comparison/image-comparison.component';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './router/google-auth.guard';
import { AppConstants } from './shared/constants/app.constants';
import { DialogService } from './shared/services/dialog.service';
import { StoryManagerComponent } from './story-manager/story-manager.component';

const activeAppGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  console.log('activeAppGuard');
  return sessionStorage.getItem(AppConstants.KEY_ACTIVE_APP_ID) ? true : inject(Router).navigate(['']);
}

const folderGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  console.log('folderGuard');

  const router = inject(Router);

  if (sessionStorage.getItem(AppConstants.KEY_GOOGLE_DATA_FILE_ID)) {
    return true;
  } else {
    await inject(DialogService).create(FolderPickerComponent);
    if (sessionStorage.getItem(AppConstants.KEY_GOOGLE_DATA_FILE_ID)) {
      return true;
    }
  }

  return router.navigate(['']);
}

export const routes: Routes = [{
  path: 'login',
  canActivate: [activeAppGuard],
  component: LoginComponent
}, {
  path: 'gallery',
  canActivateChild: [authGuard],
  children: [{
    path: '',
    canActivate: [folderGuard],
    component: GalleryComponent
  }]
}, {
  path: 'comparison',
  canActivateChild: [authGuard],
  children: [{
    path: '',
    canActivate: [folderGuard],
    component: ImageComparisonComponent
  }]
}, {
  path: 'story-manager',
  canActivate: [authGuard],
  component: StoryManagerComponent
}, {
  path: '',
  component: LandingComponent
}, {
  path: '**',
  redirectTo: ''
}];
