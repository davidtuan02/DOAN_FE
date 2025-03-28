import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  throwError,
  switchMap,
  map,
  of,
} from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { BASE_URL } from '../constants/api.const';
import { UserService } from './user.service';

// Storage key for selected project
const SELECTED_PROJECT_KEY = 'selectedProject';

export interface Project {
  id?: string;
  name: string;
  description: string;
  key?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'active' | 'completed' | 'archived';
  deadline?: string;
  completedTasks?: number;
  totalTasks?: number;
  usersIncludes?: any[];
  team?: any;
}

export interface CreateProjectDto {
  name: string;
  description: string;
  key: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  key?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private apiUrl = `${BASE_URL}/projects`;

  // BehaviorSubject to track the currently selected project
  private selectedProjectSubject = new BehaviorSubject<Project | null>(
    this.getSavedSelectedProject()
  );
  public selectedProject$ = this.selectedProjectSubject.asObservable();

  constructor(private http: HttpClient, private userService: UserService) {}

  // Get the currently selected project
  getSelectedProject(): Project | null {
    return this.selectedProjectSubject.getValue();
  }

  // Set the currently selected project
  setSelectedProject(project: Project): void {
    // Save to local storage for persistence
    localStorage.setItem(SELECTED_PROJECT_KEY, JSON.stringify(project));
    this.selectedProjectSubject.next(project);
  }

  // Get saved selected project from local storage
  private getSavedSelectedProject(): Project | null {
    const savedProject = localStorage.getItem(SELECTED_PROJECT_KEY);
    if (savedProject) {
      try {
        return JSON.parse(savedProject);
      } catch (error) {
        console.error('Error parsing saved project', error);
        localStorage.removeItem(SELECTED_PROJECT_KEY);
      }
    }
    return null;
  }

  // Clear selected project
  clearSelectedProject(): void {
    localStorage.removeItem(SELECTED_PROJECT_KEY);
    this.selectedProjectSubject.next(null);
  }

  // Get all projects
  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/all`).pipe(
      tap((projects) => console.log('Fetched all projects', projects.length)),
      catchError((error) => {
        console.error('Error fetching projects', error);
        return throwError(() => new Error('Failed to load projects'));
      })
    );
  }

  // Get projects for current user
  getCurrentUserProjects(): Observable<Project[]> {
    const userId = this.userService.getCurrentUserId();

    if (!userId) {
      console.error('No user ID available when fetching user projects');
      return throwError(
        () => new Error('No user ID available. Please log in again.')
      );
    }

    return this.http.get<Project[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap((projects) => console.log('Fetched user projects', projects.length)),
      catchError((error) => {
        console.error('Error fetching user projects', error);
        return throwError(() => new Error('Failed to load your projects'));
      })
    );
  }

  // Get project by ID
  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`).pipe(
      tap((project) => console.log('Fetched project', project.id)),
      catchError((error) => {
        console.error(`Error fetching project ${id}`, error);
        return throwError(() => new Error('Failed to load project details'));
      })
    );
  }

  // Get members of a project
  getProjectMembers(projectId: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${projectId}`).pipe(
      map((project) => {
        // Extract team members from the project
        if (project.team && project.team.users) {
          return project.team.users;
        } else if (project.usersIncludes && project.usersIncludes.length > 0) {
          return project.usersIncludes;
        }
        return [];
      }),
      tap((members) =>
        console.log(
          `Fetched ${members.length} project members for project ${projectId}`
        )
      ),
      catchError((error) => {
        console.error(`Error fetching project members for ${projectId}`, error);
        return throwError(
          () => new Error('Failed to load project team members')
        );
      })
    );
  }

  // Create a new project
  createProject(
    project: CreateProjectDto,
    teamId?: string
  ): Observable<Project> {
    const userId = this.userService.getCurrentUserId();

    if (!userId) {
      console.error('No user ID available when creating project');
      return throwError(
        () => new Error('No user ID available. Please log in again.')
      );
    }

    const jwtToken = this.userService['jwtService'].getToken();
    console.log(`Creating project for user ${userId}:`, project);
    console.log('Authorization token:', jwtToken);

    // If teamId is provided, include it in the request body
    const requestBody = teamId ? { ...project, teamId } : project;

    // Thêm thông tin gọi API rõ ràng hơn
    const url = `${this.apiUrl}/create/userOwner/${userId}`;
    console.log('Request URL:', url);
    console.log('Request Body:', requestBody);

    return this.http
      .post<Project>(url, requestBody, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((newProject) => console.log('Created new project', newProject)),
        // Automatically create a default board for the new project
        switchMap((newProject) => {
          if (!newProject.id) {
            console.warn('New project has no ID, cannot create default board');
            return of(newProject);
          }

          console.log('Creating default board for new project:', newProject.id);
          // Create a default board for this project
          return this.createDefaultBoard(newProject.id).pipe(
            // Return the original project
            map(() => newProject),
            catchError((error) => {
              console.error(
                'Error creating default board, but project was created:',
                error
              );
              // Still return the project even if board creation fails
              return of(newProject);
            })
          );
        }),
        catchError((error) => {
          console.error('Error creating project:', error);
          console.error('Error request URL:', url);
          console.error('Error request payload:', requestBody);
          console.error('Error response body:', error.error);
          console.error('Error response status:', error.status);

          // Cung cấp thông báo lỗi chi tiết hơn
          let errorMessage = 'Failed to create project';
          if (error.status === 401) {
            errorMessage =
              'You are not authorized to create projects. Please log in again.';
          } else if (error.status === 404) {
            errorMessage = 'User not found. Please log in again.';
          } else if (error.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Update a project
  updateProject(id: string, project: UpdateProjectDto): Observable<any> {
    const jwtToken = this.userService['jwtService'].getToken();
    console.log(`Updating project ${id}:`, project);
    console.log('Authorization token:', jwtToken);

    // More detailed API call information
    const url = `${this.apiUrl}/edit/${id}`;
    console.log('Update request URL:', url);
    console.log('Update request payload:', project);

    return this.http
      .put<any>(url, project, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((result) => console.log('Updated project', id, result)),
        catchError((error) => {
          console.error(`Error updating project ${id}:`, error);
          console.error('Error response body:', error.error);
          console.error('Error response status:', error.status);

          let errorMessage = 'Failed to update project';
          if (error.status === 401) {
            errorMessage = 'You are not authorized to update this project.';
          } else if (error.status === 404) {
            errorMessage = 'Project not found.';
          } else if (error.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Delete a project
  deleteProject(id: string): Observable<any> {
    const jwtToken = this.userService['jwtService'].getToken();
    console.log(`Deleting project ${id}`);
    console.log('Authorization token:', jwtToken);

    // More detailed API call information
    const url = `${this.apiUrl}/delete/${id}`;
    console.log('Delete request URL:', url);

    return this.http
      .delete<any>(url, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((result) => console.log('Deleted project', id, result)),
        catchError((error) => {
          console.error(`Error deleting project ${id}:`, error);
          console.error('Error response body:', error.error);
          console.error('Error response status:', error.status);

          let errorMessage = 'Failed to delete project';
          if (error.status === 401) {
            errorMessage = 'You are not authorized to delete this project.';
          } else if (error.status === 404) {
            errorMessage = 'Project not found.';
          } else if (error.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Get projects for a team
  getProjectsByTeam(teamId: string): Observable<Project[]> {
    const jwtToken = this.userService['jwtService'].getToken();
    console.log(`Getting projects for team ${teamId}`);
    console.log('Authorization token:', jwtToken);

    // More detailed API call information
    const url = `${BASE_URL}/teams/${teamId}/projects`;
    console.log('Request URL:', url);

    return this.http
      .get<Project[]>(url, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((projects) => {
          console.log(`Fetched ${projects.length} projects for team ${teamId}`);
          console.log('Projects data:', projects);
        }),
        catchError((error) => {
          console.error(`Error fetching projects for team ${teamId}:`, error);
          console.error('Error response body:', error.error);
          console.error('Error response status:', error.status);

          let errorMessage = 'Failed to load team projects';
          if (error.status === 401) {
            errorMessage =
              "You are not authorized to view this team's projects.";
          } else if (error.status === 404) {
            errorMessage = 'Team not found.';
          } else if (error.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Assign project to team
  assignProjectToTeam(projectId: string, teamId: string): Observable<Project> {
    console.log(`Assigning project ${projectId} to team ${teamId}`);

    return this.http
      .post<Project>(`${this.apiUrl}/${projectId}/assign-to-team/${teamId}`, {})
      .pipe(
        tap((project) =>
          console.log('Project assigned to team successfully', project)
        ),
        catchError((error) => {
          console.error(`Error assigning project to team:`, error);

          let errorMessage = 'Failed to assign project to team';
          if (error.status === 401) {
            errorMessage =
              'You are not authorized to assign this project to a team.';
          } else if (error.status === 404) {
            errorMessage = 'Project or team not found.';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Create a default board for a project
  createDefaultBoard(projectId: string): Observable<any> {
    console.log(`Creating default board for project ${projectId}`);
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .post<any>(
        `${this.apiUrl}/${projectId}/create-default-board`,
        {},
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          }),
        }
      )
      .pipe(
        tap((board) => console.log('Created default board for project', board)),
        catchError((error) => {
          console.error('Error creating default board:', error);
          let errorMessage = 'Failed to create default board for project';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }
}
