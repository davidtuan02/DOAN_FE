import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Goal,
  CreateGoalRequest,
  UpdateGoalRequest,
} from '../models/goal/goal.model';

@Injectable({
  providedIn: 'root',
})
export class GoalService {
  private apiUrl = `${environment.apiBaseUrl}/api/goals`;

  constructor(private http: HttpClient) {}

  getGoals(projectId?: string): Observable<Goal[]> {
    let url = this.apiUrl;
    if (projectId) {
      url += `?projectId=${projectId}`;
    }
    return this.http
      .get<Goal[]>(url)
      .pipe(map((goals) => goals.map((goal) => this.formatGoalDates(goal))));
  }

  getGoalById(id: string): Observable<Goal> {
    return this.http
      .get<Goal>(`${this.apiUrl}/${id}`)
      .pipe(map((goal) => this.formatGoalDates(goal)));
  }

  createGoal(goal: CreateGoalRequest): Observable<Goal> {
    console.log('GoalService.createGoal called with:', goal);
    console.log('API URL:', this.apiUrl);
    return this.http
      .post<Goal>(this.apiUrl, goal)
      .pipe(map((goal) => this.formatGoalDates(goal)));
  }

  updateGoal(id: string, goal: UpdateGoalRequest): Observable<Goal> {
    return this.http
      .patch<Goal>(`${this.apiUrl}/${id}`, goal)
      .pipe(map((goal) => this.formatGoalDates(goal)));
  }

  deleteGoal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Helper method to convert string dates to Date objects
  private formatGoalDates(goal: Goal): Goal {
    return {
      ...goal,
      startDate: goal.startDate ? new Date(goal.startDate) : null,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : null,
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt),
    };
  }

  // Helper methods to format status and timeframe for display
  getStatusDisplay(status: string): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'Not Started';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'AT_RISK':
        return 'At Risk';
      default:
        return status;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'gray';
      case 'IN_PROGRESS':
        return 'blue';
      case 'COMPLETED':
        return 'green';
      case 'AT_RISK':
        return 'red';
      default:
        return 'default';
    }
  }
}
