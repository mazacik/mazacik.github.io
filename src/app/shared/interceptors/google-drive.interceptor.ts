import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/shared/services/authentication.serivce';

export const GoogleDriveInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthenticationService);
  return next(getAuthorizedRequest(authService, request)).pipe(catchError((error: HttpErrorResponse) => {
    // if (!error.url.includes('accounts.google.com') && authService.getRefreshToken()) {
    if (error.url.includes('googleapis.com') && authService.getRefreshToken()) {
      console.log(error);
      return from(authService.requestAccessToken()).pipe(
        switchMap(() => next(getAuthorizedRequest(authService, request))),
        catchError(error => throwError(() => error))
      );
    }
  }));
}

const getAuthorizedRequest = (authService: AuthenticationService, request: HttpRequest<unknown>) => {
  return request.url.includes('googleapis.com') ? request.clone({ headers: request.headers.set('authorization', 'Bearer ' + authService.getAccessToken()) }) : request;
}
