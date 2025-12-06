import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withRouterConfig } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { GoogleDriveInterceptor } from './app/shared/interceptors/google-drive.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withFetch(), withInterceptors([GoogleDriveInterceptor])),
  ]
}).catch(error => console.error(error));
