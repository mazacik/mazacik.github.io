import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideTippyConfig } from '@ngneat/helipopper';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { GoogleDriveInterceptor } from './app/shared/interceptors/google-drive.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([GoogleDriveInterceptor])),
    importProvidersFrom(provideFirebaseApp(() => initializeApp({
      apiKey: "AIzaSyDOAks7IYxZn0CfhQfDYp06r5rP9B-4Jc8",
      authDomain: "mazacik-69cda.firebaseapp.com",
      projectId: "mazacik-69cda",
      storageBucket: "mazacik-69cda.appspot.com",
      messagingSenderId: "43148772573",
      appId: "1:43148772573:web:86c8a9749dd20d99260734"
    }))),
    importProvidersFrom(provideFirestore(() => getFirestore())),
    importProvidersFrom(provideAuth(() => getAuth())),
    provideTippyConfig({
      defaultVariation: 'tooltip',
      variations: {
        tooltip: {
          arrow: true,
          animation: 'fade',
          trigger: 'mouseenter',
          hideOnClick: false,
          offset: [0, 6]
        }
      }
    })
  ]
}).catch(error => console.error(error));