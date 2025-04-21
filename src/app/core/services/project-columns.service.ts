import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ProjectColumn,
  ProjectColumnCreateDto,
  ProjectColumnUpdateDto,
  ReorderColumnsDto,
} from '../models/project-column.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectColumnsService {
  private baseUrl = `${environment.apiBaseUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjectColumns(projectId: string): Observable<ProjectColumn[]> {
    return this.http
      .get<ProjectColumn[]>(`${this.baseUrl}/${projectId}/columns`)
      .pipe(catchError(this.handleError));
  }

  createColumn(
    projectId: string,
    columnData: ProjectColumnCreateDto
  ): Observable<ProjectColumn> {
    return this.http
      .post<ProjectColumn>(`${this.baseUrl}/${projectId}/columns`, columnData)
      .pipe(catchError(this.handleError));
  }

  updateColumn(
    projectId: string,
    columnId: string,
    columnData: ProjectColumnUpdateDto
  ): Observable<ProjectColumn> {
    return this.http
      .put<ProjectColumn>(
        `${this.baseUrl}/${projectId}/columns/${columnId}`,
        columnData
      )
      .pipe(catchError(this.handleError));
  }

  deleteColumn(projectId: string, columnId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${projectId}/columns/${columnId}`)
      .pipe(catchError(this.handleError));
  }

  reorderColumns(
    projectId: string,
    columnsOrder: ReorderColumnsDto
  ): Observable<ProjectColumn[]> {
    return this.http
      .post<ProjectColumn[]>(
        `${this.baseUrl}/${projectId}/columns/reorder`,
        columnsOrder
      )
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized access. Please log in again.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = `Error Code: ${error.status}, Message: ${error.message}`;
      }
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
