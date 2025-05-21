import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../constants/api.const';


@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private apiUrl = `${BASE_URL}/statistics`;


  constructor(private http: HttpClient) {}

  getProjectOverview(projectId: string, startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/project-overview`, { params: { projectId, startDate, endDate } });
  }

  getTaskStatus(projectId: string, startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/task-status`, { params: { projectId, startDate, endDate } });
  }

  getUserPerformance(projectId: string, userId: string, startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/user-performance`, { params: { projectId, userId, startDate, endDate } });
  }

  getSprintProgress(projectId: string, sprintId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/sprint-progress`, { params: { projectId, sprintId } });
  }

  getTimeTracking(projectId: string, startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/time-tracking`, { params: { projectId, startDate, endDate } });
  }

  getBurndownChart(projectId: string, sprintId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/burndown-chart`, { params: { projectId, sprintId } });
  }
}
