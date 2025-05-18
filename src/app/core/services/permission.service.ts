import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { Observable, map, of } from 'rxjs';
import { User, UserRole } from '../models/user/user';
import { TeamRole, TeamRolePermission, teamRolePermissions } from '../models/team-role.model';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private currentUser: User | null = null;

  constructor(private userService: UserService) {
    this.userService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  /**
   * Checks if the current user has admin privileges
   */
  isAdmin(): Observable<boolean> {
    return this.userService.currentUser.pipe(
      map(user => user?.role === UserRole.ADMIN)
    );
  }

  /**
   * Checks if the user has the specified team role permission
   */
  hasTeamPermission(role: TeamRole | string, permission: keyof TeamRolePermission): Observable<boolean> {
    // Admin always has all permissions
    if (this.currentUser?.role === UserRole.ADMIN) {
      return of(true);
    }

    // Convert role string to TeamRole enum if needed
    const teamRole = typeof role === 'string' ? role as TeamRole : role;

    // Check if the role has the requested permission
    if (teamRolePermissions[teamRole]) {
      return of(!!teamRolePermissions[teamRole][permission]);
    }

    return of(false);
  }

  /**
   * Check if the user can manage projects (create, edit, delete)
   */
  canManageProject(role: TeamRole | string): Observable<boolean> {
    return this.hasTeamPermission(role, 'canManageProject');
  }

  /**
   * Check if the user can manage sprints (create, edit, delete)
   */
  canManageSprint(role: TeamRole | string): Observable<boolean> {
    // Use the same permission as managing tasks for sprint management
    return this.hasTeamPermission(role, 'canManageTask');
  }

  /**
   * Check if the user can edit or delete tasks
   */
  canEditTask(role: TeamRole | string): Observable<boolean> {
    return this.hasTeamPermission(role, 'canEditTask');
  }

  /**
   * Check if the user can manage teams (add/remove members, change roles)
   */
  canManageTeam(role: TeamRole | string): Observable<boolean> {
    return this.hasTeamPermission(role, 'canManageTeam');
  }

  /**
   * Gets the current user's role
   */
  getCurrentUserRole(): Observable<UserRole | null> {
    return this.userService.currentUser.pipe(
      map(user => user?.role || null)
    );
  }

  /**
   * Gets the current team role (to be implemented with team context)
   * This is a placeholder and would need to be integrated with team context
   */
  getCurrentTeamRole(): Observable<TeamRole | null> {
    // In a real implementation, this would get the user's role in the current team context
    // For now, mapping user roles to team roles as a fallback
    return this.userService.currentUser.pipe(
      map(user => {
        if (!user) return null;

        if (user.role === UserRole.ADMIN) {
          return TeamRole.ADMIN;
        } else {
          // Default to member for all other roles for now
          return TeamRole.MEMBER;
        }
      })
    );
  }
}
