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
  epicId?: string;
  assigneeId?: string;
  parentTaskId?: string;
  labels?: string[];
  components?: string[];
  dueDate?: Date;
}

export interface CreateChildIssueDto {
  title: string;
  description?: string;
  priority: 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  parentTaskId: string;
  type: 'Sub-task';
  storyPoints?: number;
  assigneeId?: string;
  labels?: string[];
  dueDate?: Date;
}

export interface UpdateIssueDto {
  title?: string;
  description?: string;
  priority?: 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  type?: 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task';
  storyPoints?: number;
  epicId?: string;
  parentTaskId?: string;
  assigneeId?: string;
  labels?: string[];
  components?: string[];
  dueDate?: Date;
}

export interface IssueDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  taskName?: string;
  description?: string;
  taskDescription?: string;
  status: string;
  priority: string;
  type: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    username: string;
    age: number;
    createdAt: string;
    updatedAt: string;
  };
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  storyPoints: number;
  epicId?: string;
  parentTask?: IssueDto;
  childTasks?: IssueDto[];
  order?: number;
  labels?: string[];
  components?: string[];
  startDate?: string;
  dueDate?: string;
}

// UI Friendly model
export interface Issue {
  id: string;
  key: string;
  title: string;
  description: string;
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  status: string;
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
  epicId?: string;
  parentTask?: Issue;
  childTasks?: Issue[];
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
      epicId: issue.epicId || null,
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

  // Update an existing issue
  updateIssue(id: string, updateData: Partial<Issue>): Observable<Issue> {
    const updateTaskDto: any = {};

    // Only include fields that have been changed
    if (updateData.title !== undefined)
      updateTaskDto.taskName = updateData.title;
    if (updateData.description !== undefined)
      updateTaskDto.taskDescription = updateData.description;
    if (updateData.status !== undefined)
      updateTaskDto.status = this.mapStatusToBackend(updateData.status);
    if (updateData.priority !== undefined)
      updateTaskDto.priority = this.reverseMapPriority(updateData.priority);
    if (updateData.type !== undefined) updateTaskDto.type = updateData.type;
    if (updateData.assignee !== undefined)
      updateTaskDto.assigneeId = updateData.assignee.id;
    if (updateData.reporter !== undefined)
      updateTaskDto.reporterId = updateData.reporter.id;
    if (updateData.storyPoints !== undefined)
      updateTaskDto.storyPoints = updateData.storyPoints;
    if (updateData.labels !== undefined)
      updateTaskDto.labels = updateData.labels;
    if (updateData.epicId !== undefined)
      updateTaskDto.epicId = updateData.epicId;

    // Handle date fields
    if (updateData.startDate !== undefined) {
      const startDate =
        updateData.startDate instanceof Date
          ? updateData.startDate
          : new Date(updateData.startDate);

      if (!isNaN(startDate.getTime())) {
        updateTaskDto.startDate = startDate.toISOString();
      }
    }

    if (updateData.dueDate !== undefined) {
      const dueDate =
        updateData.dueDate instanceof Date
          ? updateData.dueDate
          : new Date(updateData.dueDate);

      if (!isNaN(dueDate.getTime())) {
        updateTaskDto.dueDate = dueDate.toISOString();
      }
    }

    const jwtToken = this.userService['jwtService'].getToken();

    console.log(`Updating issue ${id} with:`, updateTaskDto);

    return this.http
      .put<any>(`${this.apiUrl}/${id}`, updateTaskDto, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap((updatedIssue) =>
          console.log('Updated issue response:', updatedIssue)
        ),
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
    const url = `${this.apiUrl}/${issueId}/sprint`;
    const body = { sprintId: sprintId || '' };

    return this.http.put<any>(url, body).pipe(
      map((response) => this.mapTaskToIssue(response)),
      catchError((error) => {
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

  // Assign user to an issue
  assignUser(issueId: string, userId: string): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();

    console.log(`Assigning user ${userId} to issue ${issueId}`);

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
        tap((updatedIssue) => console.log('Assignee updated:', updatedIssue)),
        catchError((error) => {
          console.error(`Error assigning user to issue ${issueId}:`, error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  // Helper methods
  private mapTasksToIssues(tasks: IssueDto[]): Issue[] {
    return tasks.map((task) => this.mapTaskToIssue(task));
  }

  private mapTaskToIssue(task: IssueDto): Issue {
    const assigneeObj = task.assignee || task.assignedTo;

    const mappedIssue: Issue = {
      id: task.id,
      key: task.id.slice(0, 8).toUpperCase(),
      title: task.title || task.taskName || '',
      description: task.description || task.taskDescription || '',
      priority: this.mapTaskPriority(task.priority),
      status: this.mapTaskStatus(task.status),
      type: task.type as 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task',
      assignee: assigneeObj
        ? {
            id: assigneeObj.id,
            name: `${assigneeObj.firstName || ''} ${assigneeObj.lastName || ''}`,
            avatar: `https://ui-avatars.com/api/?name=${
              assigneeObj.firstName && assigneeObj.firstName.charAt(0) || '?'
            }${
              assigneeObj.lastName && assigneeObj.lastName.charAt(0) || '?'
            }&background=0052CC&color=fff`,
          }
        : undefined,
      reporter: task.reporter
        ? {
            id: task.reporter.id,
            name: `${task.reporter.firstName || ''} ${task.reporter.lastName || ''}`,
            avatar: `https://ui-avatars.com/api/?name=${
              task.reporter.firstName && task.reporter.firstName.charAt(0) || '?'
            }${
              task.reporter.lastName && task.reporter.lastName.charAt(0) || '?'
            }&background=7747AF&color=fff`,
          }
        : undefined,
      storyPoints: task.storyPoints || 0,
      epicId: task.epicId,
      order: task.order || 0,
      labels: task.labels || [],
      components: task.components || [],
      startDate: task.startDate ? new Date(task.startDate) : undefined,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      created: new Date(task.createdAt),
      updated: new Date(task.updatedAt),
    };

    // Map parent task if exists
    if (task.parentTask) {
      mappedIssue.parentTask = this.mapTaskToIssue(task.parentTask);
    }

    // Map child tasks if exist
    if (task.childTasks && task.childTasks.length > 0) {
      mappedIssue.childTasks = task.childTasks.map((childTask) =>
        this.mapTaskToIssue(childTask)
      );
    }

    return mappedIssue;
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
      REVIEW: 'Review',
      DONE: 'Done',
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
  ): 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' {
    const statusMap: {
      [key: string]: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
    } = {
      'To Do': 'CREATED',
      'In Progress': 'IN_PROGRESS',
      Review: 'REVIEW',
      Done: 'DONE',
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

  /**
   * Create a child task
   */
  createChildTask(
    childTask: Partial<Issue>,
    parentTaskId: string
  ): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();
    const userId = this.userService.getCurrentUserId();

    // Convert from UI model to API model
    const createChildTaskDto: any = {
      taskName: childTask.title || '',
      taskDescription: childTask.description || ' ',
      status: this.mapStatusToBackend(childTask.status || 'To Do'),
      reporterId: userId || null,
      parentTaskId: parentTaskId,
      type: childTask.type || 'Sub-task',
      priority: childTask.priority || 'Medium',
      storyPoints: childTask.storyPoints || 0,
      labels: childTask.labels || [],
    };

    console.log(
      `Creating child task for parent ${parentTaskId}:`,
      createChildTaskDto
    );

    return this.http
      .post<IssueDto>(`${this.apiUrl}/child`, createChildTaskDto, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap((createdIssue) =>
          console.log('Created new child issue:', createdIssue)
        ),
        catchError((error) => {
          console.error('Error creating child issue:', error);
          return throwError(() => new Error(this.getErrorMessage(error)));
        })
      );
  }

  /**
   * Get child tasks for a parent task
   */
  getChildTasks(parentTaskId: string): Observable<Issue[]> {
    return this.http
      .get<IssueDto[]>(`${this.apiUrl}/${parentTaskId}/children`)
      .pipe(
        map((tasks) => this.mapTasksToIssues(tasks)),
        tap((issues) =>
          console.log(
            `Fetched ${issues.length} child issues for task ${parentTaskId}`
          )
        ),
        catchError((error) => {
          console.error('Error fetching child issues:', error);
          return throwError(
            () => new Error('Failed to load child issues. Please try again.')
          );
        })
      );
  }

  /**
   * Get parent task for a child task
   */
  getParentTask(childTaskId: string): Observable<Issue> {
    return this.http.get<IssueDto>(`${this.apiUrl}/${childTaskId}/parent`).pipe(
      map((task) => this.mapTaskToIssue(task)),
      tap((issue) => console.log(`Fetched parent issue for ${childTaskId}`)),
      catchError((error) => {
        console.error(`Error fetching parent for ${childTaskId}:`, error);
        return throwError(
          () => new Error('Failed to load parent issue. Please try again.')
        );
      })
    );
  }

  /**
   * Remove parent-child relationship
   */
  removeParentChildRelationship(childTaskId: string): Observable<Issue> {
    const jwtToken = this.userService['jwtService'].getToken();

    return this.http
      .delete<IssueDto>(`${this.apiUrl}/${childTaskId}/parent`, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${jwtToken}`,
        }),
      })
      .pipe(
        map((task) => this.mapTaskToIssue(task)),
        tap(() =>
          console.log(`Removed parent relationship for ${childTaskId}`)
        ),
        catchError((error) => {
          console.error(`Error removing parent for ${childTaskId}:`, error);
          return throwError(
            () =>
              new Error(
                'Failed to remove parent relationship. Please try again.'
              )
          );
        })
      );
  }
}
