import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserService } from '../../../../core/services/user.service';
import { BASE_URL } from '../../../../core/constants/api.const';
import {
  SprintService,
  Sprint as ApiSprint,
  CreateSprintDto,
  UpdateSprintDto,
} from '../../../services/sprint.service';
import { IssueService, Issue } from '../../../services/issue.service';

export { Issue } from '../../../services/issue.service';

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
  status: 'Planning' | 'Active' | 'Completed';
  issues: Issue[];
  totalStoryPoints: number;
  completedStoryPoints: number;
}

@Injectable({
  providedIn: 'root',
})
export class BacklogService {
  private apiUrl = `${BASE_URL}`;
  private sprints = new BehaviorSubject<Sprint[]>([]);
  private backlogIssues = new BehaviorSubject<Issue[]>([]);
  private currentProjectId: string | null = null;
  private currentBoardId: string | null = null;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private sprintService: SprintService,
    private issueService: IssueService
  ) {}

  // Set the current project context
  setCurrentProject(projectId: string): void {
    this.currentProjectId = projectId;
    this.loadProjectData();
  }

  // Set the board ID directly
  setBoardId(boardId: string): void {
    this.currentBoardId = boardId;
    console.log('Board ID set in service:', boardId);
  }

  private loadProjectData(): void {
    if (!this.currentProjectId) {
      console.error('No project ID set');
      return;
    }

    // Store the current project ID in a local variable to use inside the subscription
    const projectId = this.currentProjectId;

    // Lấy tất cả tasks cho project từ IssueService
    this.issueService.getIssuesByProjectId(projectId).subscribe((issues) => {
      // Lấy sprints từ API
      this.loadSprintsForProject(projectId).subscribe({
        next: (apiSprints) => {
          const sprints = this.mapApiSprintsToSprints(apiSprints, issues);
          this.sprints.next(sprints);

          // Lọc ra những issue không thuộc sprint nào
          const sprintIssueIds = new Set(
            sprints.flatMap((sprint) => sprint.issues.map((issue) => issue.id))
          );

          const backlogIssues = issues.filter(
            (issue) => !sprintIssueIds.has(issue.id)
          );

          this.backlogIssues.next(backlogIssues);
        },
        error: (error) => {
          console.error('Error loading sprints:', error);
          // Trong trường hợp lỗi, hiển thị tất cả issues trong backlog
          this.backlogIssues.next(issues);
        },
      });
    });
  }

  private loadSprintsForProject(projectId: string): Observable<ApiSprint[]> {
    return this.sprintService.getSprintsByProjectId(projectId).pipe(
      catchError((error) => {
        console.error('Error loading sprints for project:', error);
        return of([]);
      })
    );
  }

  private mapApiSprintsToSprints(
    apiSprints: ApiSprint[],
    allIssues: Issue[]
  ): Sprint[] {
    return apiSprints.map((apiSprint) => {
      // Tìm các issue thuộc sprint này
      const sprintIssues = allIssues.filter((issue) =>
        apiSprint.issues?.some((sprintIssue) => sprintIssue.id === issue.id)
      );

      // Tính toán story points
      const totalStoryPoints = sprintIssues.reduce(
        (sum, issue) => sum + (issue.storyPoints || 0),
        0
      );

      const completedStoryPoints = sprintIssues
        .filter((issue) => issue.status === 'Done')
        .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);

      return {
        id: apiSprint.id || '',
        name: apiSprint.name,
        goal: apiSprint.goal,
        startDate: apiSprint.startDate,
        endDate: apiSprint.endDate,
        status: this.mapApiStatusToUiStatus(apiSprint.status),
        issues: sprintIssues,
        totalStoryPoints,
        completedStoryPoints,
      };
    });
  }

  private mapApiStatusToUiStatus(
    status: string
  ): 'Planning' | 'Active' | 'Completed' {
    const statusMap: {
      [key: string]: 'Planning' | 'Active' | 'Completed';
    } = {
      planning: 'Planning',
      active: 'Active',
      completed: 'Completed',
    };
    return statusMap[status] || 'Planning';
  }

  // Helper method to get board ID from project
  private getBoardIdForProject(projectId: string): Observable<string | null> {
    console.log('Getting board ID for project:', projectId);
    return this.http.get<any>(`${this.apiUrl}/projects/${projectId}`).pipe(
      map((project) => {
        console.log('Project data received:', project);
        if (project.boards && project.boards.length > 0) {
          const boardId = project.boards[0].id;
          console.log('Found board for project:', boardId);

          // Store the board ID
          this.currentBoardId = boardId;

          return boardId;
        }
        console.warn('No boards found for project ID:', projectId);

        // Create a default board
        return this.createDefaultBoardIfNeeded(projectId);
      }),
      catchError((error) => {
        console.error('Error fetching project boards:', error);
        return of(null);
      })
    );
  }

  // Create a default board if one doesn't exist
  private createDefaultBoardIfNeeded(
    projectId: string
  ): Observable<string | null> {
    console.log('Creating default board for project:', projectId);
    return this.http
      .post<any>(
        `${this.apiUrl}/projects/${projectId}/create-default-board`,
        {}
      )
      .pipe(
        map((board) => {
          console.log('Created default board:', board);
          if (board && board.id) {
            // Store the board ID
            this.currentBoardId = board.id;
            return board.id;
          }
          return null;
        }),
        catchError((error) => {
          console.error('Error creating default board:', error);
          return of(null);
        })
      );
  }

  createSprint(sprintData: Partial<Sprint>): Observable<void> {
    if (!this.currentProjectId) {
      return throwError(
        () =>
          new Error(
            'No current project selected. Please select a project first.'
          )
      );
    }

    // Create the sprint data payload
    const createSprintDto: CreateSprintDto = {
      name: sprintData.name || 'New Sprint',
      goal: sprintData.goal || '',
      status: 'planning',
      startDate: sprintData.startDate,
      endDate: sprintData.endDate,
    };

    console.log('Creating sprint with data:', createSprintDto);
    console.log('Current board ID in service:', this.currentBoardId);

    // Nếu đã có sẵn board ID thì dùng luôn
    if (this.currentBoardId) {
      console.log(`Using stored board ID: ${this.currentBoardId}`);

      // Ensure the board ID is a valid string
      if (
        typeof this.currentBoardId !== 'string' ||
        this.currentBoardId.trim() === ''
      ) {
        console.error('Board ID is invalid:', this.currentBoardId);
        return throwError(
          () =>
            new Error(
              'Invalid board ID. Please refresh the page and try again.'
            )
        );
      }

      return this.sprintService
        .createSprint(this.currentBoardId, createSprintDto)
        .pipe(
          tap(() => {
            console.log('Sprint created successfully with board ID');
            this.loadProjectData();
          }),
          map(() => undefined),
          catchError((error) => {
            console.error('Sprint creation failed:', error);
            if (error.status === 404) {
              // If board not found, try to get it again
              console.log('Board not found, attempting to retrieve again');
              return this.getBoardIdForProject(this.currentProjectId!).pipe(
                switchMap((boardId) => {
                  if (!boardId) {
                    return throwError(
                      () =>
                        new Error(
                          'Could not find or create board for this project'
                        )
                    );
                  }

                  // Try creating the sprint again with the new board ID
                  return this.sprintService
                    .createSprint(boardId, createSprintDto)
                    .pipe(
                      tap(() => {
                        console.log(
                          'Sprint created successfully after retrieving board ID'
                        );
                        this.loadProjectData();
                      }),
                      map(() => undefined)
                    );
                })
              );
            }
            return throwError(
              () => new Error('Failed to create sprint. Please try again.')
            );
          })
        );
    }

    // If we don't have board ID cached, try to get it from project
    console.log('No board ID in service, trying to retrieve from project');
    return this.getBoardIdForProject(this.currentProjectId).pipe(
      switchMap((boardId) => {
        if (!boardId) {
          console.error('No board found for project and could not create one');
          return throwError(
            () =>
              new Error(
                'No board found for this project. Please try refreshing the page.'
              )
          );
        }

        // Store the boardId for future use
        this.currentBoardId = boardId;
        console.log(`Found board ID: ${boardId}, using for sprint creation`);

        // Create sprint with the board ID
        return this.sprintService.createSprint(boardId, createSprintDto).pipe(
          tap(() => {
            console.log('Sprint created successfully with retrieved board ID');
            this.loadProjectData();
          }),
          map(() => undefined),
          catchError((error) => {
            console.error('Sprint creation failed:', error);
            return throwError(
              () =>
                new Error('Failed to create sprint. Please try again later.')
            );
          })
        );
      }),
      catchError((error) => {
        console.error('Error retrieving board ID:', error);
        return throwError(
          () =>
            new Error(
              'Failed to retrieve board information. Please try refreshing the page.'
            )
        );
      })
    );
  }

  updateSprint(sprintId: string, sprintData: Partial<Sprint>): Observable<any> {
    // Kiểm tra tham số
    if (!sprintId) {
      console.error('Missing sprint ID for update');
      return throwError(() => new Error('Sprint ID is required'));
    }

    console.log('Updating sprint with ID:', sprintId);
    console.log('Sprint data:', sprintData);

    // Convert from UI model to API model with explicit typing
    const updateDto: UpdateSprintDto = {
      name: sprintData.name,
      goal: sprintData.goal,
      status: this.reverseMapSprintStatus(sprintData.status),
      startDate: sprintData.startDate,
      endDate: sprintData.endDate,
    };

    // Kiểm tra định dạng ngày tháng
    if (updateDto.startDate) {
      console.log('Start date for API:', updateDto.startDate);
    }
    if (updateDto.endDate) {
      console.log('End date for API:', updateDto.endDate);
    }

    return this.sprintService.updateSprint(sprintId, updateDto).pipe(
      tap((response) => {
        console.log('Sprint updated successfully:', response);
        // Refresh the data
        this.loadProjectData();
      }),
      catchError((error) => {
        console.error('Error updating sprint:', error);
        return throwError(
          () =>
            new Error(
              'Failed to update sprint. ' +
                (error.error?.message || error.message || 'Please try again')
            )
        );
      })
    );
  }

  private reverseMapSprintStatus(
    status?: 'Planning' | 'Active' | 'Completed'
  ): 'planning' | 'active' | 'completed' | undefined {
    if (!status) return undefined;

    const statusMap: {
      [key: string]: 'planning' | 'active' | 'completed';
    } = {
      Planning: 'planning',
      Active: 'active',
      Completed: 'completed',
    };
    return statusMap[status];
  }

  deleteSprint(sprintId: string): Observable<void> {
    return this.sprintService.deleteSprint(sprintId).pipe(
      tap(() => {
        // Refresh the data after deletion
        this.loadProjectData();
      }),
      catchError((error) => {
        console.error('Error deleting sprint:', error);
        return throwError(() => new Error('Failed to delete sprint'));
      })
    );
  }

  startSprint(sprintId: string): Observable<void> {
    return this.sprintService.startSprint(sprintId).pipe(
      tap(() => {
        this.loadProjectData();
      }),
      map(() => undefined),
      catchError((error) => {
        console.error('Error starting sprint:', error);
        return throwError(() => new Error('Failed to start sprint'));
      })
    );
  }

  completeSprint(sprintId: string): Observable<void> {
    return this.sprintService.completeSprint(sprintId).pipe(
      tap(() => {
        this.loadProjectData();
      }),
      map(() => undefined),
      catchError((error) => {
        console.error('Error completing sprint:', error);
        return throwError(() => new Error('Failed to complete sprint'));
      })
    );
  }

  getSprints(): Observable<Sprint[]> {
    return this.sprints.asObservable();
  }

  getBacklogIssues(): Observable<Issue[]> {
    return this.backlogIssues.asObservable();
  }

  // Phương thức để tải lại dữ liệu sau khi có thay đổi
  refreshData(): void {
    console.log('Refreshing backlog data...');
    if (this.currentProjectId) {
      this.loadProjectData();
    } else {
      console.error('Cannot refresh: No current project set');
    }
  }

  // Thêm phương thức để cập nhật local state sau khi thực hiện thành công một thao tác CRUD
  updateLocalIssueState(
    updatedIssue: Issue,
    operation: 'create' | 'update' | 'delete'
  ): void {
    if (!updatedIssue || !updatedIssue.id) {
      console.error('Invalid issue data provided for local state update');
      return;
    }

    console.log(
      `Updating local state after ${operation} operation:`,
      updatedIssue
    );

    // Lấy state hiện tại
    const currentSprints = this.sprints.getValue();
    const currentBacklogIssues = this.backlogIssues.getValue();

    if (operation === 'delete') {
      // Xử lý xóa issue
      // Xóa khỏi backlog nếu có
      const newBacklogIssues = currentBacklogIssues.filter(
        (i) => i.id !== updatedIssue.id
      );

      // Xóa khỏi tất cả sprint
      const newSprints = currentSprints.map((sprint) => {
        return {
          ...sprint,
          issues: sprint.issues.filter((i) => i.id !== updatedIssue.id),
        };
      });

      this.sprints.next(newSprints);
      this.backlogIssues.next(newBacklogIssues);
      return;
    }

    // Xử lý tạo mới hoặc cập nhật
    if (updatedIssue.sprintId) {
      // Issue thuộc về một sprint
      let sprintFound = false;

      // Cập nhật trong sprint
      const newSprints = currentSprints.map((sprint) => {
        if (sprint.id === updatedIssue.sprintId) {
          sprintFound = true;

          // Kiểm tra xem issue đã tồn tại trong sprint này chưa
          const issueIndex = sprint.issues.findIndex(
            (i) => i.id === updatedIssue.id
          );

          if (issueIndex >= 0) {
            // Cập nhật issue hiện có
            const updatedIssues = [...sprint.issues];
            updatedIssues[issueIndex] = updatedIssue;
            return {
              ...sprint,
              issues: updatedIssues,
            };
          } else {
            // Thêm issue mới vào sprint
            return {
              ...sprint,
              issues: [...sprint.issues, updatedIssue],
            };
          }
        }

        // Kiểm tra và xóa issue khỏi các sprint khác nếu đã được di chuyển
        if (operation === 'update') {
          const issueIndex = sprint.issues.findIndex(
            (i) => i.id === updatedIssue.id
          );
          if (issueIndex >= 0) {
            return {
              ...sprint,
              issues: sprint.issues.filter((i) => i.id !== updatedIssue.id),
            };
          }
        }

        return sprint;
      });

      // Xóa khỏi backlog nếu issue đã được chuyển vào sprint
      const newBacklogIssues = currentBacklogIssues.filter(
        (i) => i.id !== updatedIssue.id
      );

      this.sprints.next(newSprints);
      this.backlogIssues.next(newBacklogIssues);
    } else {
      // Issue thuộc về backlog

      // Xóa khỏi tất cả sprint
      const newSprints = currentSprints.map((sprint) => {
        return {
          ...sprint,
          issues: sprint.issues.filter((i) => i.id !== updatedIssue.id),
        };
      });

      // Cập nhật trong backlog
      const backlogIssueIndex = currentBacklogIssues.findIndex(
        (i) => i.id === updatedIssue.id
      );
      let newBacklogIssues = [...currentBacklogIssues];

      if (backlogIssueIndex >= 0) {
        // Cập nhật issue hiện có
        newBacklogIssues[backlogIssueIndex] = updatedIssue;
      } else {
        // Thêm issue mới vào backlog
        newBacklogIssues.push(updatedIssue);
      }

      this.sprints.next(newSprints);
      this.backlogIssues.next(newBacklogIssues);
    }
  }
}
