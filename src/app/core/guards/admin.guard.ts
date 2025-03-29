import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { UserRole } from '../models/user/user';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router,
    private message: NzMessageService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return this.userService.getCurrentUser().pipe(
      map((user) => {
        if (user.role === UserRole.ADMIN) {
          return true;
        }
        return this.handleUnauthorized();
      }),
      catchError((error) => {
        console.error('Error checking admin status:', error);
        return of(this.handleUnauthorized());
      })
    );
  }

  private handleUnauthorized(): boolean | UrlTree {
    this.message.error('Only administrators can access this page');
    return this.router.parseUrl('/board');
  }
}
