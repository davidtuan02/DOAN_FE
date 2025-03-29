import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UserService } from './user.service';
import { TeamService, Team, TeamMember } from './team.service';
import { UserRole } from '../models/user/user';

// Define permissions according to the new structure
export enum PermissionType {
  MANAGE_TEAM = 'manage_team',
  MANAGE_PROJECT = 'manage_project',
  MANAGE_TASK = 'manage_task',
  VIEW_TEAM = 'view_team',
  VIEW_PROJECT = 'view_project',
  VIEW_TASK = 'view_task',
  CREATE_TASK = 'create_task',
  UPDATE_TASK = 'update_task',
}

@Injectable({
  providedIn: 'root',
})
export class TeamPermissionsService {
  constructor(
    private userService: UserService,
    private teamService: TeamService
  ) {}

  /**
   * Check if the current user has a specific permission in a team context
   */
  hasPermission(
    teamId: string,
    permission: PermissionType
  ): Observable<boolean> {
    const currentUserId = this.userService.getCurrentUserId();

    if (!currentUserId) {
      return of(false);
    }

    // First, check if the user is an admin (global role)
    return this.userService.getCurrentUser().pipe(
      switchMap((user) => {
        // Admin has special permissions
        if (user.role === UserRole.ADMIN) {
          switch (permission) {
            case PermissionType.MANAGE_TEAM:
            case PermissionType.VIEW_TEAM:
              return of(true);
            case PermissionType.MANAGE_PROJECT:
              return of(false); // Admin cannot create projects
            case PermissionType.VIEW_PROJECT:
              return of(true); // Admin can view projects
            case PermissionType.MANAGE_TASK:
            case PermissionType.CREATE_TASK:
            case PermissionType.UPDATE_TASK:
              return of(false); // Admin cannot create tasks
            case PermissionType.VIEW_TASK:
              return of(true); // Admin can view tasks
            default:
              return of(false);
          }
        }

        // For non-admin users, check team-based permissions
        return this.teamService.getTeamMembers(teamId).pipe(
          map((members) => {
            const userMember = members.find(
              (member) => member.user.id === currentUserId
            );

            if (!userMember) {
              return false; // User is not a member of this team
            }

            // Check permissions based on team role
            return this.resolveTeamRolePermission(userMember.role, permission);
          }),
          catchError((error) => {
            console.error('Error checking team permissions:', error);
            return of(false);
          })
        );
      })
    );
  }

  /**
   * Determine if a user has permission based on their team role
   */
  private resolveTeamRolePermission(
    role: string,
    permission: PermissionType
  ): boolean {
    switch (role) {
      case 'leader':
        // Leaders can manage projects and tasks, but not teams
        switch (permission) {
          case PermissionType.MANAGE_TEAM:
            return false;
          case PermissionType.MANAGE_PROJECT:
          case PermissionType.VIEW_PROJECT:
          case PermissionType.MANAGE_TASK:
          case PermissionType.VIEW_TASK:
          case PermissionType.CREATE_TASK:
          case PermissionType.UPDATE_TASK:
            return true;
          default:
            return false;
        }

      case 'member':
        // Members can only create and update their own tasks
        switch (permission) {
          case PermissionType.CREATE_TASK:
          case PermissionType.UPDATE_TASK:
          case PermissionType.VIEW_TASK:
          case PermissionType.VIEW_PROJECT:
            return true;
          default:
            return false;
        }

      case 'admin':
        // Team admins can manage teams (including promoting members to leaders) but not projects or tasks
        switch (permission) {
          case PermissionType.MANAGE_TEAM:
          case PermissionType.VIEW_TEAM:
            return true;
          case PermissionType.VIEW_PROJECT:
            return true;
          case PermissionType.MANAGE_PROJECT:
            return false;
          case PermissionType.VIEW_TASK:
            return true;
          case PermissionType.MANAGE_TASK:
          case PermissionType.CREATE_TASK:
          case PermissionType.UPDATE_TASK:
            return false;
          default:
            return false;
        }

      default:
        return false;
    }
  }

  /**
   * Check if task belongs to the current user
   */
  isOwnTask(taskId: string): Observable<boolean> {
    const currentUserId = this.userService.getCurrentUserId();

    if (!currentUserId) {
      return of(false);
    }

    // Implementation would depend on how tasks are stored and retrieved
    // This is a placeholder - you would need to implement task retrieval and checking
    return of(true); // Assume true for demonstration
  }

  /**
   * Check if the current user is the leader of a team
   */
  isTeamLeader(teamId: string): Observable<boolean> {
    const currentUserId = this.userService.getCurrentUserId();

    if (!currentUserId) {
      return of(false);
    }

    return this.teamService.getTeamMembers(teamId).pipe(
      map((members) => {
        const userMember = members.find(
          (member) => member.user.id === currentUserId
        );
        return userMember ? userMember.role === 'leader' : false;
      }),
      catchError((error) => {
        console.error('Error checking team leader status:', error);
        return of(false);
      })
    );
  }
}
