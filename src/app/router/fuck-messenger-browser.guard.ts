import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from "@angular/router";

export const FuckMessengerBrowserGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  for (const userAgent of ['FB_IAB', 'FBAN', 'FBAV', 'FB4A', 'MESSENGER']) {
    if (navigator.userAgent.includes(userAgent)) {
      return inject(Router).createUrlTree(['/fuck-messenger-browser']);
    }
  }

  return true;
}
