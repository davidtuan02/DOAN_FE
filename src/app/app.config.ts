import { 
  APP_INITIALIZER, 
  LOCALE_ID,
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
import { HTTP_INTERCEPTORS, HttpClientModule, HttpClient } from '@angular/common/http';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { ApiInterceptor } from './core/interceptors/api.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { TokenInterceptor } from './core/interceptors/token.interceptor';
import { JwtService } from './core/services/jwt.service';
import { UserService } from './core/services/user.service';
import { EMPTY } from "rxjs";
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { LanguageHandler } from './core/handlers/language.handler';
import { LoaderHandler } from './core/handlers/loader.handler';
import { TranslateService } from '@ngx-translate/core';
import { BrowserModule } from '@angular/platform-browser';
import { ToastrModule } from 'ngx-toastr';
import { NgxsModule } from '@ngxs/store';
import { ToasterState } from './core/store/states/toaster.state';

export function initAuth(jwtService: JwtService, userService: UserService) {
  return () => (jwtService.getToken() ? userService.getCurrentUser() : EMPTY);
}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

export function localeFactory(handler: LanguageHandler) {
  return handler.locale;
}

export function appInitializerFactory(translate: TranslateService) {
  return () => {
    translate.setDefaultLang('es');
    return translate.use('es').toPromise();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
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
      deps: [JwtService, UserService],
      multi: true,
    },
    // {
    //   provide: LOCALE_ID,
    //   deps: [LanguageHandler],
    //   useFactory: localeFactory,
    // },
    // {
    //   provide: APP_INITIALIZER,
    //   deps: [LanguageHandler, LoaderHandler],
    //   useFactory: () => () => {},
    //   multi: true,
    // },
    // {
    //   provide: APP_INITIALIZER,
    //   useFactory: appInitializerFactory,
    //   deps: [TranslateService],
    //   multi: true
    // },
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    importProvidersFrom(
      HttpClientModule,
      BrowserModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),
      ToastrModule.forRoot({
        preventDuplicates: true,
      }),
      NgxsModule.forRoot([]),
      NgxsModule.forFeature([ToasterState]),
      ),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withDebugTracing(),
      withViewTransitions()
    ),
  ],
};
