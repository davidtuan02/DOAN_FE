import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { BASE_URL } from '../../core/constants/api.const';
import { UserService } from '../../core/services/user.service';

export interface CreateIssueDto {
  title: string;
  description?: string;
  priority: 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  type: 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task';
  storyPoints?: number;
  sprintId?: string;
  epicId?: string;
  assigneeId?: string;
  labels?: string[];
  components?: string[];
  dueDate?: Date;
}

export interface UpdateIssueDto {
  title?: string;
  description?: string;
  priority?: 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  type?: 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task';
  storyPoints?: number;
  sprintId?: string;
  epicId?: string;
  assigneeId?: string;
  labels?: string[];
  components?: string[];
  dueDate?: Date;
}

export interface IssueDto {
  id: string;
  title?: string;
  description?: string;
  taskName?: string;
  taskDescription?: string;
  priority: string;
  status: string;
  type: string;
  storyPoints?: number;
  sprintId?: string;
  epicId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  labels?: string[];
  components?: string[];
  order?: number;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// UI Friendly model
export interface Issue {
  id: string;
  key: string;
  title: string;
  description: string;
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  type: 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task';
  assignee?: {
    id: string;
    name: string;
    avatar: string;
  };
  reporter?: {
    id: string;
    name: string;
    avatar: string;
  };
  dueDate?: Date;
  startDate?: Date;
  storyPoints?: number;
  sprintId?: string;
  epicId?: string;
  order: number;
  labels: string[];
  components: string[];
  created: Date;
  updated: Date;
}

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  private apiUrl = `${BASE_URL}/tasks`;

  constructor(private http: HttpClient, private userService: UserService) {}

  // Lấy tất cả issues cho một project
  getIssuesByProjectId(projectId: string): Observable<Issue[]> {
    return this.http
      .get<IssueDto[]>(`${this.apiUrl}/project/${projectId}`)
      .pipe(
        map((tasks) => this.mapTasksToIssues(tasks)),
        tap((issues) =>
          console.log(
            `Fetched ${issues.length} issues for project ${projectId}`
          )
        ),
        catchError((error) => {
          console.error('Error fetching issues:', error);
          return throwError(
            () => new Error('Failed to load issues. Please try again.')
          );
        })
      );
  }

  // Lấy một issue theo ID
  getIssueById(issueId: string): Observable<Issue> {
    return this.http.get<IssueDto>(`${this.apiUrl}/${issueId}`).pipe(
      map((task) => this.mapTaskToIssue(task)),
      tap((issue) => console.log(`Fetched issue: ${issue.id}`)),
      catchError((error) => {
        console.error(`Error fetching issue ${issueId}:`, error);
        return throwError(() => new Error('Failed to load issue details.'));
      })
    );
  }

  // Tạo issue mới
  createIssue(projectId: string, issue: Partial<Issue>): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();
    const userId = this.userService.getCurrentUserId();

    // Convert from UI model to API model
    const createTaskDto: any = {
      taskName: issue.title || '',
      taskDescription: issue.description || ' ',
      status: this.mapStatusToBackend(issue.status || 'To Do'),
      reporterId: userId || null,
      type: issue.type || 'Task',
      priority: issue.priority || 'Medium',
      storyPoints: issue.storyPoints || 0,
      labels: issue.labels || [],
      sprintId: issue.sprintId || null,
      dueDate: issue.dueDate || null,
      startDate: issue.startDate || null,
    };

    console.log(`Creating issue for project ${projectId}:`, createTaskDto);

    return this.http
      .post<IssueDto>(`${this.apiUrl}/create/${projectId}`, createTaskDto, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap((createdIssue) => console.log('Created new issue:', createdIssue)),
        catchError((error) => {
          console.error('Error creating issue:', error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Cập nhật issue
  updateIssue(issueId: string, updateData: Partial<Issue>): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();

    // Map from UI model to API model
    const updateTaskDto: any = {};

    if (updateData.title !== undefined)
      updateTaskDto.taskName = updateData.title;
    if (updateData.description !== undefined)
      updateTaskDto.taskDescription = updateData.description;
    if (updateData.status !== undefined)
      updateTaskDto.status = this.mapStatusToBackend(updateData.status);
    if (updateData.assignee?.id !== undefined)
      updateTaskDto.assigneeId = updateData.assignee.id;
    if (updateData.reporter?.id !== undefined)
      updateTaskDto.reporterId = updateData.reporter.id;
    if (updateData.type !== undefined) updateTaskDto.type = updateData.type;
    if (updateData.priority !== undefined)
      updateTaskDto.priority = updateData.priority;
    if (updateData.storyPoints !== undefined)
      updateTaskDto.storyPoints = updateData.storyPoints;
    if (updateData.labels !== undefined)
      updateTaskDto.labels = updateData.labels;
    if (updateData.sprintId !== undefined)
      updateTaskDto.sprintId = updateData.sprintId;
    if (updateData.dueDate !== undefined)
      updateTaskDto.dueDate = updateData.dueDate;
    if (updateData.startDate !== undefined)
      updateTaskDto.startDate = updateData.startDate;

    console.log(`Updating issue ${issueId}:`, updateTaskDto);

    return this.http
      .put<IssueDto>(`${this.apiUrl}/${issueId}`, updateTaskDto, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap((updatedIssue) => console.log('Updated issue:', updatedIssue)),
        catchError((error) => {
          console.error('Error updating issue:', error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Xóa issue
  deleteIssue(issueId: string): Observable<void> {
    const jwtToken = this.userService['jwtService'].getToken();

    console.log(`Deleting issue ${issueId}`);

    return this.http
      .delete<void>(`${this.apiUrl}/${issueId}`, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap(() => console.log('Deleted issue', issueId)),
        catchError((error) => {
          console.error(`Error deleting issue ${issueId}:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Gán issue cho người dùng
  assignIssue(issueId: string, userId: string): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();

    console.log(`Assigning issue ${issueId} to user ${userId}`);

    return this.http
      .put<IssueDto>(
        `${this.apiUrl}/${issueId}/assign`,
        { userId },
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          }),
        }
      )
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap((assignedIssue) => console.log('Issue assigned:', assignedIssue)),
        catchError((error) => {
          console.error('Error assigning issue:', error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Move issue to a sprint
  moveIssueToSprint(issueId: string, sprintId?: string): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();

    console.log(
      `Moving issue ${issueId} to ${
        sprintId ? 'sprint ' + sprintId : 'backlog'
      }`
    );

    // Backend có một endpoint "/tasks/:id/sprint" cho việc thêm task vào sprint
    const apiUrl = `${this.apiUrl}/${issueId}/sprint`;
    const payload = { sprintId: sprintId || null };

    return this.http
      .put<IssueDto>(apiUrl, payload, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap((issue) => console.log('Issue moved to sprint:', issue)),
        catchError((error) => {
          console.error(`Error moving issue ${issueId} to sprint:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Cập nhật trạng thái issue
  updateIssueStatus(
    issueId: string,
    status: 'To Do' | 'In Progress' | 'Review' | 'Done'
  ): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();
    const apiStatus = this.mapStatusToBackend(status);

    console.log(
      `Updating issue ${issueId} status to ${status} (API: ${apiStatus})`
    );

    return this.http
      .put<IssueDto>(
        `${this.apiUrl}/${issueId}`,
        { status: apiStatus },
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          }),
        }
      )
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap((updatedIssue) =>
          console.log('Issue status updated:', updatedIssue)
        ),
        catchError((error) => {
          console.error(`Error updating issue ${issueId} status:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Set reporter for an issue
  setReporter(issueId: string, userId: string): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();

    console.log(`Setting reporter for issue ${issueId} to user ${userId}`);

    return this.http
      .put<IssueDto>(
        `${this.apiUrl}/${issueId}/reporter`,
        { userId },
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          }),
        }
      )
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap((updatedIssue) => console.log('Reporter updated:', updatedIssue)),
        catchError((error) => {
          console.error(`Error setting reporter for issue ${issueId}:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Get reporter for an issue
  getReporter(issueId: string): Observable<any> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .get<any>(`${this.apiUrl}/${issueId}/reporter`, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        tap((reporter) => console.log('Retrieved reporter:', reporter)),
        catchError((error) => {
          console.error(`Error getting reporter for issue ${issueId}:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Helper methods
  private mapTasksToIssues(tasks: IssueDto[]): Issue[] {
    return tasks.map((task) => this.mapTaskToIssue(task));
  }

  private mapTaskToIssue(task: IssueDto): Issue {
    // Map từ dữ liệu API sang mô hình UI
    return {
      id: task.id,
      key: `SCRUM-${task.id.substring(0, 4)}`,
      title: task.title || task.taskName || '',
      description: task.description || task.taskDescription || '',
      priority: this.mapTaskPriority(task.priority || 'MEDIUM'),
      status: this.mapTaskStatus(task.status || 'CREATED'),
      type:
        (task.type as 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task') || 'Task',
      assignee: task.assignedTo
        ? {
            id: task.assignedTo.id,
            name: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
            avatar: `https://ui-avatars.com/api/?name=${task.assignedTo.firstName.charAt(
              0
            )}${task.assignedTo.lastName.charAt(
              0
            )}&background=6554C0&color=fff`,
          }
        : undefined,
      reporter: task.reporter
        ? {
            id: task.reporter.id,
            name: `${task.reporter.firstName} ${task.reporter.lastName}`,
            avatar: `https://ui-avatars.com/api/?name=${
              task.reporter.firstName.charAt(0) || '?'
            }${
              task.reporter.lastName.charAt(0) || '?'
            }&background=7747AF&color=fff`,
          }
        : undefined,
      storyPoints: task.storyPoints || 0,
      sprintId: task.sprintId,
      epicId: task.epicId,
      order: task.order || 0,
      labels: task.labels || [],
      components: task.components || [],
      startDate: task.startDate ? new Date(task.startDate) : undefined,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      created: new Date(task.createdAt),
      updated: new Date(task.updatedAt),
    };
  }

  private mapTaskPriority(
    priority: string
  ): 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' {
    const priorityMap: {
      [key: string]: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
    } = {
      HIGHEST: 'Highest',
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low',
      LOWEST: 'Lowest',
    };
    return priorityMap[priority] || 'Medium';
  }

  private mapTaskStatus(
    status: string
  ): 'To Do' | 'In Progress' | 'Review' | 'Done' {
    const statusMap: {
      [key: string]: 'To Do' | 'In Progress' | 'Review' | 'Done';
    } = {
      CREATED: 'To Do',
      IN_PROGRESS: 'In Progress',
      FINISH: 'Done',
    };
    return statusMap[status] || 'To Do';
  }

  private reverseMapPriority(
    priority: string
  ): 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST' {
    const priorityMap: {
      [key: string]: 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
    } = {
      Highest: 'HIGHEST',
      High: 'HIGH',
      Medium: 'MEDIUM',
      Low: 'LOW',
      Lowest: 'LOWEST',
    };
    return priorityMap[priority] || 'MEDIUM';
  }

  private reverseMapStatus(
    status: string
  ): 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' {
    const statusMap: {
      [key: string]: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
    } = {
      'To Do': 'TODO',
      'In Progress': 'IN_PROGRESS',
      Review: 'REVIEW',
      Done: 'DONE',
    };
    return statusMap[status] || 'TODO';
  }

  private mapStatusToBackend(
    status: string
  ): 'CREATED' | 'IN_PROGRESS' | 'FINISH' {
    const statusMap: {
      [key: string]: 'CREATED' | 'IN_PROGRESS' | 'FINISH';
    } = {
      'To Do': 'CREATED',
      'In Progress': 'IN_PROGRESS',
      Review: 'IN_PROGRESS',
      Done: 'FINISH',
    };
    return statusMap[status] || 'CREATED';
  }

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
