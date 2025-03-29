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
import {
  TeamPermissionsService,
  PermissionType,
} from '../services/team-permissions.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({
  providedIn: 'root',
})
export class TeamPermissionGuard implements CanActivate {
  constructor(
    private permissionService: TeamPermissionsService,
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
    const teamId = route.paramMap.get('teamId');
    const requiredPermission = route.data[
      'requiredPermission'
    ] as PermissionType;

    if (!teamId || !requiredPermission) {
      console.error(
        'TeamPermissionGuard: Missing teamId or requiredPermission'
      );
      return this.handleUnauthorized();
    }

    return this.permissionService
      .hasPermission(teamId, requiredPermission)
      .pipe(
        map((hasPermission) => {
          if (hasPermission) {
            return true;
          }
          return this.handleUnauthorized();
        }),
        catchError((error) => {
          console.error('Error checking permissions:', error);
          return of(this.handleUnauthorized());
        })
      );
  }

  private handleUnauthorized(): boolean | UrlTree {
    this.message.error('You do not have permission to access this resource');
    return this.router.parseUrl('/board');
  }
}
