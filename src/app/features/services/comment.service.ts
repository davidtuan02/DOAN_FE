import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { BASE_URL } from '../../core/constants/api.const';
import { UserService } from '../../core/services/user.service';

export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  taskId: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateCommentDto {
  content: string;
  taskId: string;
}

export interface UpdateCommentDto {
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private apiUrl = `${BASE_URL}/comments`;

  constructor(private http: HttpClient, private userService: UserService) {}

  // Get all comments for a task
  getCommentsByTaskId(taskId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/task/${taskId}`).pipe(
      tap((comments) =>
        console.log(`Fetched ${comments.length} comments for task ${taskId}`)
      ),
      map((comments) => this.formatComments(comments)),
      catchError((error) => {
        console.error('Error fetching comments:', error);
        return throwError(
          () => new Error('Failed to load comments. Please try again.')
        );
      })
    );
  }

  // Create a new comment
  createComment(comment: CreateCommentDto): Observable<Comment> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .post<Comment>(this.apiUrl, comment, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((createdComment) =>
          console.log('Comment created:', createdComment)
        ),
        map((comment) => this.formatComment(comment)),
        catchError((error) => {
          console.error('Error creating comment:', error);
          return throwError(
            () => new Error('Failed to create comment. Please try again.')
          );
        })
      );
  }

  // Update a comment
  updateComment(id: string, comment: UpdateCommentDto): Observable<Comment> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .put<Comment>(`${this.apiUrl}/${id}`, comment, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((updatedComment) =>
          console.log('Comment updated:', updatedComment)
        ),
        map((comment) => this.formatComment(comment)),
        catchError((error) => {
          console.error(`Error updating comment ${id}:`, error);
          return throwError(
            () => new Error('Failed to update comment. Please try again.')
          );
        })
      );
  }

  // Delete a comment
  deleteComment(id: string): Observable<void> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .delete<void>(`${this.apiUrl}/${id}`, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap(() => console.log(`Comment ${id} deleted`)),
        catchError((error) => {
          console.error(`Error deleting comment ${id}:`, error);
          return throwError(
            () => new Error('Failed to delete comment. Please try again.')
          );
        })
      );
  }

  // Helper method to format dates in comments
  private formatComments(comments: any[]): Comment[] {
    return comments.map((comment) => this.formatComment(comment));
  }

  private formatComment(comment: any): Comment {
    return {
      ...comment,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
    };
  }
}
