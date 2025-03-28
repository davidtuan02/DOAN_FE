import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BASE_URL } from '../constants/api.const';
import { catchError, tap, switchMap, map } from 'rxjs/operators';
import { UserService } from './user.service';

export interface CreateTeamDto {
  name: string;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
}

export interface AddMemberToTeamDto {
  userId: string;
  role: 'leader' | 'member' | 'admin';
}

export interface UpdateMemberRoleDto {
  role: 'leader' | 'member' | 'admin';
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usersIncludes: TeamMember[];
}

export interface TeamMember {
  id: string;
  role: 'leader' | 'member' | 'admin';
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

export interface TeamAccess {
  hasAccess: boolean;
  role: 'leader' | 'member' | 'admin' | null;
}

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private apiUrl = `${BASE_URL}/teams`;

  constructor(private http: HttpClient, private userService: UserService) {}

  // Get all teams
  getAllTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(this.apiUrl);
  }

  // Get teams for current user
  getMyTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.apiUrl}/my-teams`);
  }

  // Get team by ID
  getTeamById(id: string): Observable<Team> {
    return this.http.get<Team>(`${this.apiUrl}/${id}`);
  }

  // Create a new team
  createTeam(team: CreateTeamDto): Observable<Team> {
    const userId = this.userService.getCurrentUserId();
    console.log('[DEBUG] Creating team - User ID:', userId);

    if (!userId) {
      console.error('[ERROR] Creating team failed - No user ID available');
      // Thử tìm user hiện tại
      this.userService.getCurrentUser().subscribe({
        next: (user) => console.log('[DEBUG] Current user loaded:', user),
        error: (err) =>
          console.error('[ERROR] Failed to load current user:', err),
      });

      return throwError(
        () => new Error('No user ID available. Please log in again.')
      );
    }

    // Add createdBy to the payload as a backup if the token authentication fails
    const payload = {
      ...team,
      createdBy: userId,
    };

    console.log('[DEBUG] Team creation payload:', payload);

    // Kiểm tra xem token có tồn tại không
    const hasToken = !!this.userService['jwtService'].getToken();
    console.log('[DEBUG] JWT token exists:', hasToken);

    return this.http.post<Team>(this.apiUrl, payload).pipe(
      tap((response) =>
        console.log('[DEBUG] Team created successfully:', response)
      ),
      catchError((error) => {
        console.error('[ERROR] Team creation failed:', error);

        // In ra chi tiết lỗi để debug
        if (error.error) {
          console.error('[ERROR] Server error details:', error.error);
        }

        // Kiểm tra và in token
        const token = this.userService['jwtService'].getToken();
        console.log(
          '[DEBUG] JWT token for request:',
          token ? token.substring(0, 10) + '...' : 'No token'
        );

        // Nếu lỗi 500, đây thường là lỗi backend, thử đề xuất giải pháp
        if (error.status === 500) {
          // Thử lần nữa với payload khác
          const retryPayload = {
            ...payload,
            // Đảm bảo createdBy là string
            createdBy: String(userId),
          };

          console.log('[DEBUG] Retrying with modified payload:', retryPayload);

          return this.http.post<Team>(this.apiUrl, retryPayload).pipe(
            tap((response) =>
              console.log(
                '[DEBUG] Team created successfully (retry):',
                response
              )
            ),
            catchError((retryError) => {
              console.error('[ERROR] Team creation retry failed:', retryError);
              const errorMessage =
                error.error?.message ||
                (error.status === 500
                  ? 'Server error. This might be due to database constraints or invalid data.'
                  : 'Failed to create team');
              return throwError(() => new Error(errorMessage));
            })
          );
        }

        const errorMessage =
          error.error?.message ||
          (error.status === 500
            ? 'Server error. This might be due to database constraints or invalid data.'
            : 'Failed to create team');
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // Update a team
  updateTeam(id: string, team: UpdateTeamDto): Observable<Team> {
    return this.http.put<Team>(`${this.apiUrl}/${id}`, team);
  }

  // Delete a team
  deleteTeam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Add member to team
  addMemberToTeam(
    teamId: string,
    member: AddMemberToTeamDto
  ): Observable<TeamMember> {
    return this.http.post<TeamMember>(
      `${this.apiUrl}/${teamId}/members`,
      member
    );
  }

  // Update member role
  updateMemberRole(
    teamId: string,
    userId: string,
    roleData: UpdateMemberRoleDto
  ): Observable<TeamMember> {
    return this.http.put<TeamMember>(
      `${this.apiUrl}/${teamId}/members/${userId}/role`,
      roleData
    );
  }

  // Remove member from team
  removeMemberFromTeam(teamId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${teamId}/members/${userId}`);
  }

  // Get team members
  getTeamMembers(teamId: string): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.apiUrl}/${teamId}/members`);
  }

  // Validate team access
  validateTeamAccess(teamId: string): Observable<TeamAccess> {
    return this.http.get<TeamAccess>(
      `${this.apiUrl}/${teamId}/validate-access`
    );
  }

  // Get team projects
  getTeamProjects(teamId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${teamId}/projects`);
  }

  // Get users available to add to the team
  getAvailableUsersForTeam(teamId: string): Observable<any[]> {
    // First, get the current team members to exclude them
    return this.getTeamMembers(teamId).pipe(
      switchMap((members) => {
        // Extract member user IDs
        const memberUserIds = members.map((member) => member.user.id);

        // Then get all users and filter out existing members
        return this.userService
          .getAllUsers()
          .pipe(
            map((users) =>
              users.filter((user) => !memberUserIds.includes(user.id))
            )
          );
      }),
      catchError((error) => {
        console.error('Error getting available users:', error);
        return throwError(() => new Error('Failed to load available users'));
      })
    );
  }
}
