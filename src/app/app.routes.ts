import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, Routes } from '@angular/router';
import { FolderPickerComponent } from './gallery/folder-picker/folder-picker.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LandingComponent } from './landing/landing.component';
import { ShoppingListComponent } from './shopping-list/shopping-list.component';
import { authGuard } from './router/google-auth.guard';
import { AppConstants } from './shared/constants/app.constants';
import { DialogService } from './shared/services/dialog.service';
import { StoryManagerComponent } from './story-manager/story-manager.component';

const folderGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
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
  component: LandingComponent
}, {
  path: 'gallery',
  canActivateChild: [authGuard],
  children: [{
    path: '',
    canActivate: [folderGuard],
    component: GalleryComponent
  }]
}, {
  path: 'story-manager',
  canActivate: [authGuard],
  component: StoryManagerComponent
}, {
  path: 'shopping-list',
  component: ShoppingListComponent
}, {
  path: '',
  component: LandingComponent
}, {
  path: '**',
  redirectTo: ''
}];
