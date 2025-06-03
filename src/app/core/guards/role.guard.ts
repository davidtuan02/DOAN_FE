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
    return this.userService.getCurrentUser().pipe(
      take(1),
      map((user) => {
        if (!user) return false;

        // Manager has access to everything
        if (user.role === UserRole.MANAGER) {
          return true;
        }

        const requiredRole = route.data['role'] as UserRole;
        return user.role === requiredRole;
      })
    );
  }
}
