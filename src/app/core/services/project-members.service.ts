import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../constants/api.const';

export enum AccessLevel {
  OWNER = '50',
  MAINTAINER = '40',
  DEVELOPER = '30',
  REPORTER = '20',
}

export interface ProjectMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  accessLevel: AccessLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddProjectMemberDto {
  userId: string;
  accessLevel: AccessLevel;
}

export interface AddMultipleProjectMembersDto {
  members: AddProjectMemberDto[];
}

export interface UpdateProjectMemberDto {
  accessLevel: AccessLevel;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectMembersService {
  private apiUrl = `${BASE_URL}/projects`;

  constructor(private http: HttpClient) {}

  getProjectMembers(projectId: string): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(
      `${this.apiUrl}/${projectId}/members`
    );
  }

  addMemberToProject(
    projectId: string,
    member: AddProjectMemberDto
  ): Observable<ProjectMember> {
    return this.http.post<ProjectMember>(
      `${this.apiUrl}/${projectId}/members`,
      member
    );
  }

  addMultipleMembersToProject(
    projectId: string,
    members: AddMultipleProjectMembersDto
  ): Observable<ProjectMember[]> {
    return this.http.post<ProjectMember[]>(
      `${this.apiUrl}/${projectId}/members/bulk`,
      members
    );
  }

  updateProjectMember(
    projectId: string,
    userId: string,
    member: UpdateProjectMemberDto
  ): Observable<ProjectMember> {
    return this.http.put<ProjectMember>(
      `${this.apiUrl}/${projectId}/members/${userId}`,
      member
    );
  }

  removeProjectMember(projectId: string, userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${projectId}/members/${userId}`);
  }
}
