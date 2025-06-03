import { Injectable, Inject } from '@angular/core';
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
import { TeamRole, TeamRolePermissions } from '../models/team-role.model';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class TeamRoleGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private teamService: TeamService,
    private router: Router,
    @Inject(AuthService) private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredPermission = route.data[
      'teamPermission'
    ] as keyof (typeof TeamRolePermissions)[TeamRole];
    const teamId = route.paramMap.get('teamId') || route.paramMap.get('id');

    if (!teamId) {
      return of(true); // No team ID to check against
    }

    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) return false;

        // Manager users have access to everything
        if (user.role === UserRole.MANAGER) {
          return true;
        }

        const requiredRole = route.data['role'] as TeamRole;
        return this.teamService.validateTeamAccess(teamId).pipe(
          map(access => access.role === requiredRole)
        );
      }),
      switchMap((access) => {
        if (!access) {
          return of(false);
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
            const permissions = TeamRolePermissions[userTeamRole];

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
