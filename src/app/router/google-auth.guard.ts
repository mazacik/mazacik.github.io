import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from "@angular/router";
import { AuthenticationService } from "../shared/services/authentication.serivce";
import { AppConstants } from "../shared/constants/app.constants";

export const GoogleAuthGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  sessionStorage.setItem(AppConstants.KEY_ACTIVE_APP_ID, route.url.join(''));
  console.log('guard: start');

  const router: Router = inject(Router);
  const authenticationService: AuthenticationService = inject(AuthenticationService);

  if (authenticationService.getAccessToken()) {
    console.log('guard: has access token, return true');
    return true;
  }

  console.log('guard: no access token');

  if (authenticationService.getRefreshToken()) {
    console.log('guard: has refresh token');

    if (await authenticationService.requestAccessToken()) {
      console.log('guard: got access token from refresh token, return true');
      return true;
    }

    console.log('guard: could not get access token from refresh token');
  }

  console.log('guard: return false');
  return router.navigate(['login']);
}
