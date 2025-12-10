import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from "@angular/router";
import { AuthenticationService } from "../shared/services/authentication.serivce";

export const authGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);

  console.log('guard: start');

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
