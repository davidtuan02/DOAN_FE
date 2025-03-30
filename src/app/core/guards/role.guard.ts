import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { UserRole } from '../models/user/user';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredRole = route.data['role'] as UserRole;

    return this.userService.getCurrentUser().pipe(
      take(1),
      map((user) => {
        // Admin has access to everything
        if (user.role === UserRole.ADMIN) {
          return true;
        }

        // If role matches or no specific role required
        if (!requiredRole || user.role === requiredRole) {
          return true;
        }

        // Redirect to unauthorized page or dashboard
        return this.router.createUrlTree(['/error'], {
          queryParams: { reason: 'UnauthorizedAccess' },
        });
      })
    );
  }
}
