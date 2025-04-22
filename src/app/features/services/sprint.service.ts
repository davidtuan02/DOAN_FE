import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { BASE_URL } from '../../core/constants/api.const';
import { UserService } from '../../core/services/user.service';

export interface Sprint {
  id?: string;
  name: string;
  goal?: string;
  status: 'planning' | 'active' | 'completed';
  startDate?: Date;
  endDate?: Date;
  issues?: any[];
}

export interface CreateSprintDto {
  name: string;
  goal?: string;
  status: 'planning' | 'active' | 'completed';
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateSprintDto {
  name?: string;
  goal?: string;
  status?: 'planning' | 'active' | 'completed';
  startDate?: Date;
  endDate?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class SprintService {
  private apiUrl = `${BASE_URL}/sprints`;
  private currentSelectedSprintSubject = new BehaviorSubject<Sprint | null>(
    null
  );

  // Observable that components can subscribe to
  public currentSelectedSprint$ =
    this.currentSelectedSprintSubject.asObservable();

  constructor(private http: HttpClient, private userService: UserService) {}

  // Set the currently selected active sprint
  setCurrentSprint(sprint: Sprint): void {
    console.log('Setting current selected sprint:', sprint);
    this.currentSelectedSprintSubject.next(sprint);
  }

  // Get the current active sprint
  getCurrentSprint(): Sprint | null {
    return this.currentSelectedSprintSubject.getValue();
  }

  // Get all sprints
  getAllSprints(): Observable<Sprint[]> {
    return this.http.get<Sprint[]>(`${this.apiUrl}/all`).pipe(
      tap((sprints) => console.log('Fetched all sprints', sprints.length)),
      catchError((error) => {
        console.error('Error fetching sprints', error);
        return throwError(() => new Error('Failed to load sprints'));
      })
    );
  }

  // Get sprint by ID
  getSprintById(id: string): Observable<Sprint> {
    return this.http.get<Sprint>(`${this.apiUrl}/${id}`).pipe(
      tap((sprint) => console.log('Fetched sprint', sprint.id)),
      catchError((error) => {
        console.error(`Error fetching sprint ${id}`, error);
        return throwError(() => new Error('Failed to load sprint details'));
      })
    );
  }

  // Get sprints by project ID
  getSprintsByProjectId(projectId: string): Observable<Sprint[]> {
    return this.http.get<Sprint[]>(`${this.apiUrl}/project/${projectId}`).pipe(
      tap((sprints) =>
        console.log(`Fetched sprints for project ${projectId}`, sprints.length)
      ),
      catchError((error) => {
        console.error(`Error fetching sprints for project ${projectId}`, error);
        return throwError(
          () => new Error('Failed to load sprints for this project')
        );
      })
    );
  }

  // Create a new sprint
  createSprint(boardId: string, sprint: CreateSprintDto): Observable<Sprint> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .post<Sprint>(`${this.apiUrl}/create/${boardId}`, sprint, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((newSprint) => console.log('Created new sprint', newSprint)),
        catchError((error) => {
          console.error('Error creating sprint:', error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Update a sprint
  updateSprint(id: string, sprint: UpdateSprintDto): Observable<Sprint> {
    const jwtToken = this.userService['jwtService'].getToken();

    // Ensure dates are properly formatted for the API
    const formattedSprint: any = { ...sprint };

    // Format dates to ISO strings if they're Date objects
    if (
      formattedSprint.startDate &&
      formattedSprint.startDate instanceof Date
    ) {
      formattedSprint.startDate = formattedSprint.startDate.toISOString();
    }

    if (formattedSprint.endDate && formattedSprint.endDate instanceof Date) {
      formattedSprint.endDate = formattedSprint.endDate.toISOString();
    }

    console.log('Formatted sprint data for API:', formattedSprint);

    return this.http
      .put<Sprint>(`${this.apiUrl}/${id}`, formattedSprint, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((updatedSprint) =>
          console.log('Updated sprint response:', updatedSprint)
        ),
        catchError((error) => {
          console.error(`Error updating sprint ${id}:`, error);
          console.error('Error details:', error.error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Delete a sprint
  deleteSprint(id: string): Observable<void> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .delete<void>(`${this.apiUrl}/${id}`, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap(() => console.log('Deleted sprint', id)),
        catchError((error) => {
          console.error(`Error deleting sprint ${id}:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Start a sprint
  startSprint(id: string): Observable<Sprint> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .put<Sprint>(
        `${this.apiUrl}/${id}/start`,
        {},
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          }),
        }
      )
      .pipe(
        tap((sprint) => console.log('Started sprint', sprint)),
        catchError((error) => {
          console.error(`Error starting sprint ${id}:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Complete a sprint
  completeSprint(id: string): Observable<Sprint> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .put<Sprint>(
        `${this.apiUrl}/${id}/complete`,
        {},
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          }),
        }
      )
      .pipe(
        tap((sprint) => console.log('Completed sprint', sprint)),
        catchError((error) => {
          console.error(`Error completing sprint ${id}:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Helper method to get meaningful error messages
  private getErrorMessage(error: any): string {
    let errorMessage = 'An error occurred';

    if (error.status === 401) {
      errorMessage = 'You are not authorized to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status === 500) {
      errorMessage = 'Server error occurred. Please try again later.';
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    }

    return errorMessage;
  }
}
