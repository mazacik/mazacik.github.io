import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from "@angular/router";
import { FirebaseAuthService } from "../shared/services/firebase-auth.service";

export const FirebaseAuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  if (inject(FirebaseAuthService).hasLocalStorageEntry()) {
    return true;
  }

  return inject(Router).createUrlTree(['/splav-2024/firebase-login']);
}
