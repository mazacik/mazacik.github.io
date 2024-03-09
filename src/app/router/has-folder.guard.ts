import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from "@angular/router";
import { StringUtils } from "../shared/utils/string.utils";

export const hasFolderGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router: Router = inject(Router);

  const dataFileId: string = sessionStorage.getItem('dataFileId');
  if (!StringUtils.isEmpty(dataFileId)) {
    return true;
  }

  router.navigate(['/folder-picker']);
  return false;
}
