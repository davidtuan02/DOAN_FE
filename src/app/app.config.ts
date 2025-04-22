import {
  APP_INITIALIZER,
  ApplicationConfig,
  importProvidersFrom,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  withDebugTracing,
  withPreloading,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { TokenInterceptor } from './core/interceptors/token.interceptor';
import { JwtService } from './core/services/jwt.service';
import { UserService } from './core/services/user.service';
import { EMPTY, of } from 'rxjs';
import { BrowserModule } from '@angular/platform-browser';
import { QuillModule } from 'ngx-quill';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BoardService } from './core/services';
import { CoreModule } from './core/core.module';
import { TeamModule } from './features/components/team/team.module';
import { catchError } from 'rxjs/operators';
// NG-Zorro locale imports
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';

// Register Angular locale data
registerLocaleData(en);

// Chỉ load user data nếu có token
export function initAuth(jwtService: JwtService, userService: UserService) {
  return () => {
    const token = jwtService.getToken();

    if (token) {
      return userService.getCurrentUser().pipe(
        catchError(() => {
          // Xóa token nếu có lỗi khi load user
          jwtService.destroyToken();
          return of(null);
        })
      );
    } else {
      return EMPTY;
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
      BrowserAnimationsModule,
      QuillModule.forRoot(),
      CoreModule,
      TeamModule
    ),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withViewTransitions()
    ),
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: {
        dateFormat: 'longDate',
      },
    },
    // NG-Zorro locale provider
    { provide: NZ_I18N, useValue: en_US },
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [JwtService, UserService, BoardService],
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true,
    },
  ],
};
