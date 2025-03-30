import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { TeamService } from '../services/team.service';
import { UserRole } from '../models/user/user';
import { TeamRole, teamRolePermissions } from '../models/team-role.model';

@Injectable({
  providedIn: 'root',
})
export class TeamRoleGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private teamService: TeamService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredPermission = route.data[
      'teamPermission'
    ] as keyof (typeof teamRolePermissions)[TeamRole];
    const teamId = route.paramMap.get('teamId') || route.paramMap.get('id');

    if (!teamId) {
      return of(true); // No team ID to check against
    }

    return this.userService.getCurrentUser().pipe(
      take(1),
      switchMap((user) => {
        // Admin users have access to everything
        if (user.role === UserRole.ADMIN) {
          return of(true);
        }

        // Check team access for other users
        return this.teamService.validateTeamAccess(teamId).pipe(
          map((access) => {
            if (!access.hasAccess || !access.role) {
              return this.router.createUrlTree(['/error'], {
                queryParams: { reason: 'TeamAccessDenied' },
              });
            }

            // Check team role permissions
            if (!requiredPermission) {
              return true; // No specific permission required
            }

            const userTeamRole = access.role;
            const permissions = teamRolePermissions[userTeamRole];

            // Check if user has the required permission
            if (permissions && permissions[requiredPermission]) {
              return true;
            }

            return this.router.createUrlTree(['/error'], {
              queryParams: { reason: 'TeamPermissionDenied' },
            });
          }),
          catchError(() => {
            return of(
              this.router.createUrlTree(['/error'], {
                queryParams: { reason: 'TeamAccessError' },
              })
            );
          })
        );
      })
    );
  }
}
