import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/shared/services/authentication.serivce';

export const GoogleDriveInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthenticationService);
  return next(getAuthorizedRequest(authService, request)).pipe(catchError((error: HttpErrorResponse) => {
    return handleResponseError(authService, error, request, next);
  })) as any;
};

const getAuthorizedRequest = (authService: AuthenticationService, request: HttpRequest<unknown>) => {
  return request.url.includes('googleapis.com') ? request.clone({ headers: request.headers.set('authorization', 'Bearer ' + authService.getAccessToken()) }) : request;
}

const handleResponseError = async (authService: AuthenticationService, error: HttpErrorResponse, request?: HttpRequest<any>, next?: HttpHandlerFn) => {
  if (!error.url.includes('accounts.google.com')) {
    if (await authService.requestAccessToken()) {
      return next(getAuthorizedRequest(authService, request));
    }
  }
}
