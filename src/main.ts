import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { GoogleDriveInterceptor } from './app/shared/interceptors/google-drive.interceptor';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withFetch(), withInterceptors([GoogleDriveInterceptor])),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore())
  ]
}).catch(error => console.error(error));
