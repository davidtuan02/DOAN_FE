import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  TeamPermissionsService,
  PermissionType,
} from '../services/team-permissions.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({
  providedIn: 'root',
})
export class TaskOwnershipGuard implements CanActivate {
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
    const taskId = route.paramMap.get('taskId');
    const teamId = route.paramMap.get('teamId');

    if (!taskId) {
      console.error('TaskOwnershipGuard: Missing taskId');
      return this.handleUnauthorized();
    }

    // First check if user owns this task
    return this.permissionService.isOwnTask(taskId).pipe(
      switchMap((isOwner) => {
        if (isOwner) {
          return of(true);
        }

        // If not the owner, check if they have permission to manage tasks in the team
        if (teamId) {
          return this.permissionService.hasPermission(
            teamId,
            PermissionType.MANAGE_TASK
          );
        }

        return of(false);
      }),
      map((hasPermission) => {
        if (hasPermission) {
          return true;
        }
        return this.handleUnauthorized();
      }),
      catchError((error) => {
        console.error('Error checking task ownership permissions:', error);
        return of(this.handleUnauthorized());
      })
    );
  }

  private handleUnauthorized(): boolean | UrlTree {
    this.message.error('You do not have permission to manage this task');
    return this.router.parseUrl('/board');
  }
}
