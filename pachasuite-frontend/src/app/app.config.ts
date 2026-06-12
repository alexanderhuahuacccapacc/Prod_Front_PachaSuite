import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { RECAPTCHA_V3_SITE_KEY, ReCaptchaV3Service, RecaptchaLoaderService } from 'ng-recaptcha';
import { idempotencyInterceptor } from './core/interceptors/idempotency.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    RecaptchaLoaderService,        // ← separado, como provider directo
    ReCaptchaV3Service,            // ← separado, como provider directo
    {
      provide: RECAPTCHA_V3_SITE_KEY,
      useValue: '6LcZWfUsAAAAAHqiMDxx_5c8KTYWSd3j4JFwjpWz'
    },
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([jwtInterceptor, idempotencyInterceptor ])),
    provideAnimations()
  ]
};
