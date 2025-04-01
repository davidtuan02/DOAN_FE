import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JwtService } from '../services';

@Injectable({ providedIn: 'root' })
export class TokenInterceptor implements HttpInterceptor {
  constructor(private readonly jwtService: JwtService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.jwtService.getToken();

    // Log for all requests to API
    if (req.url.includes('/api/')) {
      if (token) {
        // Check if token looks valid (simple structure check)
        try {
          const parts = token.split('.');
          if (parts.length !== 3) {
            console.warn(
              '[TOKEN WARNING] Token does not have valid JWT structure'
            );
          } else {
          }
        } catch (e) {
          console.error('[TOKEN ERROR] Token validation error:', e);
        }
      }
    }

    // Log project-related requests in detail
    if (req.url.includes('/projects')) {
    }

    if (token) {
      const request = req.clone({
        setHeaders: {
          tasks_token: token,
        },
      });

      return next.handle(request).pipe(
        tap({
          error: (err) => {
            if (err instanceof HttpErrorResponse) {
              console.error(
                `[API ERROR] ${req.method} ${req.url} - Status: ${err.status}`,
                err.error
              );
            }
          },
        })
      );
    }

    return next.handle(req);
  }
}
