import { 
  APP_INITIALIZER, 
  ApplicationConfig, 
  importProvidersFrom 
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  withDebugTracing,
  withPreloading,
  withViewTransitions
} from '@angular/router';
import { routes } from './app.routes';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { TokenInterceptor } from './core/interceptors/token.interceptor';
import { JwtService } from './core/services/jwt.service';
import { UserService } from './core/services/user.service';
import { EMPTY } from "rxjs";
import { BrowserModule } from '@angular/platform-browser';
import { QuillModule } from 'ngx-quill';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BoardService } from './core/services';
import { CoreModule } from './core/core.module';

export function initAuth(jwtService: JwtService, userService: UserService) {
  return () => (jwtService.getToken() ? userService.getCurrentUser() : EMPTY);
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
      BrowserAnimationsModule,
      QuillModule.forRoot(),
      CoreModule
    ),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withDebugTracing(),
      withViewTransitions()
    ),
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS, 
      useValue: 
        {
          dateFormat: 'longDate'
        }
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [JwtService, UserService, BoardService],
      multi: true,
    },
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: TokenInterceptor, 
      multi: true 
    },
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: ErrorInterceptor, 
      multi: true 
    },
  ],
};
