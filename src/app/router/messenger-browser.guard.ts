import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from "@angular/router";

export const MessengerBrowserGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  for (const userAgent of ['FB_IAB', 'FBAN', 'FBAV', 'FB4A', 'MESSENGER']) {
    if (navigator.userAgent.includes(userAgent)) {
      return inject(Router).createUrlTree(['/messenger-browser']);
    }
  }

  return true;
}
