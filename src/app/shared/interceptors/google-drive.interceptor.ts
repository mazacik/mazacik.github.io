import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';

import { Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/shared/services/authentication.serivce';

@Injectable()
export class GoogleDriveInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthenticationService
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    return next.handle(this.getAuthorizedRequest(request)).pipe(catchError((error: HttpErrorResponse) => {
      return this.handleResponseError(error, request, next);
    }));
  }

  getAuthorizedRequest(request: HttpRequest<any>): HttpRequest<any> {
    return request.url.includes('googleapis.com') ? request.clone({ headers: request.headers.set('authorization', 'Bearer ' + this.authService.getAccessToken()) }) : request;
  }

  async handleResponseError(error: HttpErrorResponse, request?: HttpRequest<any>, next?: HttpHandler): Promise<void> {
    if (!error.url.includes('accounts.google.com')) {
      if (await this.authService.requestAccessToken()) {
        switchMap(() => next.handle(this.getAuthorizedRequest(request)));
      }
    }
  }

}
