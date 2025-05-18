import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from "@angular/common/http";
import * as fromStore from '../../core/store';
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { Router } from "@angular/router";
import { Store } from "@ngrx/store";

@Injectable({ providedIn: "root" })
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly router: Router,
    private store: Store<fromStore.AppState>,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.store.dispatch(fromStore.logout());
          this.router.navigate(['/login']);
        }

        return throwError(() => err.error);
      })
    );
  }
}
