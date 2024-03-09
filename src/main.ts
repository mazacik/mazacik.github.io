import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
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