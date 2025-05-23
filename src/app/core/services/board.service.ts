import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Observable,
  of,
  throwError,
  BehaviorSubject,
  combineLatest,
  forkJoin,
  switchMap,
} from 'rxjs';
import { catchError, tap, map, shareReplay } from 'rxjs/operators';
import { Card, Column, Comment, PartialCard, User } from '../models';
import { SprintService, Sprint } from '../../features/services/sprint.service';
import { IssueService, Issue } from '../../features/services/issue.service';
import { ProjectService } from './project.service';
import { CardTypesEnum } from '../enums';
import { BASE_URL } from '../constants/api.const';
import { UserService } from './user.service';
import { Store } from '@ngrx/store';
import { selectSelectedCardId } from '../store/card/card.selectors';

@Injectable({ providedIn: 'root' })
export class BoardService {
  private columnsSubject = new BehaviorSubject<Column[]>([]);
  private cardsSubject = new BehaviorSubject<Card[]>([]);
  private currentSprint$ = new BehaviorSubject<Sprint | null>(null);
  private activeSprintsSubject = new BehaviorSubject<Sprint[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private apiUrl = `${BASE_URL}`;

  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public currentSprint = this.currentSprint$.asObservable();
  public activeSprints$ = this.activeSprintsSubject.asObservable();

  // Standard column definitions for JIRA-like workflow
  private readonly defaultColumns: Column[] = [
    {
      id: 'todo',
      name: 'To Do',
      textColor: '#42526E',
      bgBadge: '#E9F5FE',
      bgButton: '#0052CC',
      color: '#0052CC',
    },
    {
      id: 'inprogress',
      name: 'In Progress',
      textColor: '#42526E',
      bgBadge: '#E9F5FE',
      bgButton: '#0052CC',
      color: '#0052CC',
    },
    {
      id: 'review',
      name: 'Review',
      textColor: '#42526E',
      bgBadge: '#FFF0B3',
      bgButton: '#FF991F',
      color: '#FF991F',
    },
    {
      id: 'done',
      name: 'Done',
      textColor: '#42526E',
      bgBadge: '#E4FCEf',
      bgButton: '#36B37E',
      color: '#36B37E',
    },
  ];

  constructor(
    private http: HttpClient,
    private sprintService: SprintService,
    private issueService: IssueService,
    private projectService: ProjectService,
    private userService: UserService,
    private store: Store
  ) {}

  // Initialize board data for the current project and active sprint
  initBoardData(): Observable<{ columns: Column[]; cards: Card[] }> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Get the current project and find its active sprint
    return this.projectService.selectedProject$.pipe(
      switchMap((project) => {
        if (!project || !project.id) {
          this.errorSubject.next('No project selected');
          this.loadingSubject.next(false);
          return throwError(() => new Error('No project selected'));
        }

        // Get all sprints for the project
        return this.sprintService.getSprintsByProjectId(project.id).pipe(
          switchMap((sprints) => {
            // Find all active sprints
            const activeSprints = sprints.filter(
              (sprint) => sprint.status === 'active'
            );

            this.activeSprintsSubject.next(activeSprints);

            if (activeSprints.length === 0) {
              this.currentSprint$.next(null);
              this.errorSubject.next('No active sprints found');
              this.loadingSubject.next(false);
              // Return empty data
              return of({ columns: this.defaultColumns, cards: [] });
            }

            // Use the currently selected sprint from SprintService or the first active sprint
            const currentSelectedSprint = this.sprintService.getCurrentSprint();
            let activeSprint: Sprint | null = null;

            if (
              currentSelectedSprint &&
              currentSelectedSprint.status === 'active' &&
              activeSprints.some((s) => s.id === currentSelectedSprint.id)
            ) {
              activeSprint = currentSelectedSprint;
            } else if (activeSprints.length > 0) {
              // Use the first active sprint if no current sprint is selected
              activeSprint = activeSprints[0];
              this.sprintService.setCurrentSprint(activeSprint);
            }

            this.currentSprint$.next(activeSprint);

            // Check if the active sprint has an ID
            if (!activeSprint || !activeSprint.id) {
              this.errorSubject.next('Active sprint has no ID');
              this.loadingSubject.next(false);
              return of({ columns: this.defaultColumns, cards: [] });
            }

            // Get issues for the current active sprint
            return this.sprintService.getSprintById(activeSprint.id).pipe(
              map((activeSprint) => {
                // Use the issues directly from the sprint
                const sprintIssues = activeSprint.issues || [];

                // Convert issues to cards
                const cards = this.mapIssuesToCards(sprintIssues);

                // Update subjects
                this.columnsSubject.next(this.defaultColumns);
                this.cardsSubject.next(cards);
                this.loadingSubject.next(false);

                return { columns: this.defaultColumns, cards };
              })
            );
          }),
          catchError((error) => {
            console.error('Error initializing board data:', error);
            this.errorSubject.next('Failed to load sprint data');
            this.loadingSubject.next(false);
            return throwError(() => new Error('Failed to load sprint data'));
          })
        );
      }),
      shareReplay(1)
    );
  }

  getBoardColumns(): Observable<Array<Column>> {
    // Define standard columns for a Scrum board
    const columns: Column[] = [
      {
        id: 'todo',
        name: 'To Do',
        textColor: '#42526E',
        bgBadge: '#E9F5FE',
        bgButton: '#0052CC',
        color: '#0052CC',
      },
      {
        id: 'inprogress',
        name: 'In Progress',
        textColor: '#42526E',
        bgBadge: '#E9F5FE',
        bgButton: '#0052CC',
        color: '#0052CC',
      },
      {
        id: 'review',
        name: 'Review',
        textColor: '#42526E',
        bgBadge: '#FFF0B3',
        bgButton: '#FF991F',
        color: '#FF991F',
      },
      {
        id: 'done',
        name: 'Done',
        textColor: '#42526E',
        bgBadge: '#E4FCEf',
        bgButton: '#36B37E',
        color: '#36B37E',
      },
    ];

    return of(columns);
  }

  getBoardCards(): Observable<Array<Card>> {
    // Get the current project and active sprint
    return this.projectService.selectedProject$.pipe(
      switchMap((project) => {
        const projectId = project?.id;
        if (!projectId) {
          console.warn('No project selected, cannot load board cards');
          return of([]);
        }

        // Get the current selected sprint from SprintService
        const currentSprint = this.sprintService.getCurrentSprint();

        if (currentSprint && currentSprint.id) {
          console.log('Loading cards for selected sprint:', currentSprint.name);

          // Get issues specifically from the selected sprint
          return this.sprintService.getSprintById(currentSprint.id).pipe(
            map((sprint) => {
              const sprintIssues = sprint.issues || [];
              return this.mapIssuesToCards(sprintIssues);
            }),
            catchError((error) => {
              console.error('Error loading sprint issues:', error);
              return of([]);
            })
          );
        } else {
          // Fallback to getting all sprints and finding active ones
          return this.sprintService.getSprintsByProjectId(projectId).pipe(
            switchMap((sprints) => {
              // Find active sprints
              const activeSprints = sprints.filter(
                (sprint) => sprint.status === 'active'
              );

              this.activeSprintsSubject.next(activeSprints);

              if (activeSprints.length === 0) {
                console.warn(
                  'No active sprints found, returning empty cards array'
                );
                return of([]);
              }

              // Use the first active sprint if no current sprint is selected
              const sprintToUse = activeSprints[0];

              if (!sprintToUse.id) {
                console.warn('Selected sprint has no ID');
                return of([]);
              }

              // Set this as the current sprint
              this.sprintService.setCurrentSprint(sprintToUse);

              // Get issues specifically from the selected active sprint
              return this.sprintService.getSprintById(sprintToUse.id).pipe(
                map((sprint) => {
                  const sprintIssues = sprint.issues || [];
                  return this.mapIssuesToCards(sprintIssues);
                }),
                catchError((error) => {
                  console.error('Error loading sprint issues:', error);
                  return of([]);
                })
              );
            }),
            catchError((error) => {
              console.error('Error loading sprints:', error);
              return of([]);
            })
          );
        }
      })
    );
  }

  getUsers(): Observable<Array<User>> {
    return this.http.get<any[]>(`${this.apiUrl}/users/all`).pipe(
      map((users) => {
        // Transform users data to match User interface
        return users.map((user) => ({
          id: user.id,
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          username: user.username || user.email || '',
          age: user.age || 0,
          role: user.role || 'BASIC',
          createdAt: user.createdAt || new Date().toISOString(),
          updatedAt: user.updatedAt || new Date().toISOString(),
          avatar: `https://ui-avatars.com/api/?name=${
            user.firstName?.charAt(0) || '?'
          }${user.lastName?.charAt(0) || '?'}&background=0052CC&color=fff`,
        }));
      }),
      tap((users) => console.log('Processed users for board:', users)),
      catchError((error) => {
        console.error('Error fetching users:', error);
        return of([]);
      })
    );
  }

  createCard(card: Card): Observable<unknown> {
    // Check if card already exists
    const existingCards = this.cardsSubject.getValue();
    const existingCard = existingCards.find((c) => c.id === card.id);
    if (existingCard) {
      return of(existingCard);
    }

    const currentProject = this.projectService.getSelectedProject();
    if (!currentProject || !currentProject.id) {
      console.error('No project selected, cannot create card');
      return of({});
    }

    // Convert Card to Issue format
    const issue: Partial<Issue> = {
      title: card.title,
      description: card.description || '',
      status: this.mapColumnIdToStatus(card.columnId),
      priority: this.mapCardPriorityToIssuePriority(card.priority || 'Medium'),
      type: this.mapCardTypeToIssueType(card.type),
      assignee: card.assigneeId
        ? { id: card.assigneeId, name: '', avatar: '' }
        : undefined,
      labels: card.labels || [],
    };

    // Two-step process: 1) Create the issue, 2) Move it to active sprint if available
    return this.sprintService.getSprintsByProjectId(currentProject.id).pipe(
      switchMap((sprints) => {
        // Create the issue first
        return this.issueService.createIssue(currentProject.id!, issue).pipe(
          switchMap((createdIssue) => {
            // Get current selected sprint or find an active sprint
            const currentSelectedSprint = this.sprintService.getCurrentSprint();
            let targetSprint: Sprint | null = null;

            if (currentSelectedSprint && currentSelectedSprint.id) {
              targetSprint = currentSelectedSprint;
            } else {
              // Find first active sprint
              targetSprint =
                sprints.find((sprint) => sprint.status === 'active') || null;
            }

            // If no active sprint, just return the created issue
            if (!targetSprint || !targetSprint.id) {
              console.warn(
                'No active sprint found, issue created without sprint association'
              );
              return of(createdIssue);
            }

            // Move the issue to the selected active sprint
            console.log(`Moving issue to active sprint: ${targetSprint.id}`);
            return this.issueService
              .moveIssueToSprint(createdIssue.id, targetSprint.id!)
              .pipe(
                catchError((error) => {
                  console.error('Error moving issue to sprint:', error);
                  // Return the created issue even if moving to sprint fails
                  return of(createdIssue);
                })
              );
          })
        );
      })
    );
  }

  updateCard(card: PartialCard): Observable<unknown> {
    if (!card.id) {
      console.error('Cannot update card without id');
      return of({});
    }

    // Special handling for assignee changes
    if (card.assigneeId !== undefined) {
      console.log('Updating assignee using dedicated API:', card.assigneeId);
      return this.issueService.assignUser(card.id, card.assigneeId || '');
    }

    // Prepare issue update data
    const issueUpdate: Partial<Issue> = {};

    // Map column ID to status if provided
    if (card.columnId) {
      issueUpdate.status = this.mapColumnIdToStatus(card.columnId);
    }

    // Add other fields if they're provided
    if (card.title) issueUpdate.title = card.title;
    if (card.description) issueUpdate.description = card.description;
    if (card.priority)
      issueUpdate.priority = this.mapCardPriorityToIssuePriority(card.priority);
    if (card.type !== undefined)
      issueUpdate.type = this.mapCardTypeToIssueType(card.type);
    if (card.reporterId) {
      issueUpdate.reporter = { id: card.reporterId, name: '', avatar: '' };
    }
    if (card.labels) issueUpdate.labels = card.labels;
    if (card.storyPoints !== undefined)
      issueUpdate.storyPoints = card.storyPoints;

    // Add date fields
    if (card.startDate !== undefined) {
      try {
        issueUpdate.startDate = new Date(card.startDate);
      } catch (e) {
        console.error('Invalid start date format:', card.startDate);
      }
    }

    if (card.dueDate !== undefined) {
      try {
        issueUpdate.dueDate = new Date(card.dueDate);
      } catch (e) {
        console.error('Invalid due date format:', card.dueDate);
      }
    }

    console.log('Updating issue with data:', issueUpdate);
    return this.issueService.updateIssue(card.id, issueUpdate);
  }

  deleteCard(cardId: string): Observable<unknown> {
    if (!cardId) {
      console.error('Cannot delete card without id');
      return of({});
    }

    console.log('Deleting card with ID:', cardId);
    return this.issueService.deleteIssue(cardId).pipe(
      tap(() => console.log(`Card ${cardId} deleted successfully`)),
      catchError((error) => {
        console.error('Error deleting card:', error);
        return throwError(() => new Error('Failed to delete card'));
      })
    );
  }

  getLabels(): Observable<Array<string>> {
    // You could fetch these from the API if they're stored there
    // For now, return common labels
    return of([
      'bug',
      'feature',
      'enhancement',
      'documentation',
      'high-priority',
      'low-priority',
      'frontend',
      'backend',
    ]);
  }

  getComments(): Observable<Array<Comment>> {
    // Sử dụng NgRx store selector để lấy selectedCardId
    return this.store.select(selectSelectedCardId).pipe(
      switchMap((cardId) => {
        if (!cardId) {
          console.log('No card selected, returning empty comments array');
          return of([]);
        }

        // Call API để lấy comments cho task
        return this.http
          .get<Array<any>>(`${BASE_URL}/comments/task/${cardId}`)
          .pipe(
            tap((comments) =>
              console.log('Received comments from API:', comments)
            ),
            map((comments) =>
              comments.map((comment) => ({
                id: comment.id,
                uid: comment.userId,
                content: comment.content,
                cardId: comment.taskId,
                createdAt: comment.createdAt,
              }))
            ),
            catchError((error) => {
              console.error('Error fetching comments:', error);
              return of([]);
            })
          );
      })
    );
  }

  addComment(comment: Comment): Observable<unknown> {
    if (!comment.cardId) {
      console.error('Cannot add comment without card id');
      return of({});
    }

    // Lấy current project và user ID
    const currentProject = this.projectService.getSelectedProject();
    const userId = this.userService.getCurrentUserId();

    if (!currentProject || !currentProject.id) {
      console.error('No project selected, cannot add comment');
      return of({});
    }

    // Gọi CommentService để tạo comment
    // Chuyển đổi từ Card Comment sang Task Comment DTO
    const createCommentDto = {
      content: comment.content,
      taskId: comment.cardId, // Trong BE, cardId chính là taskId
    };

    console.log('Calling comment service with:', createCommentDto);

    // Import và inject CommentService vào constructor trước khi sử dụng!
    return this.http
      .post(`${BASE_URL}/comments`, createCommentDto, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.userService['jwtService'].getToken()}`,
        }),
      })
      .pipe(
        tap((response) => console.log('Comment API response:', response)),
        catchError((error) => {
          console.error('Error creating comment:', error);
          return throwError(() => new Error('Failed to create comment'));
        })
      );
  }

  // Helper methods
  private mapIssuesToCards(issues: any[]): Card[] {
    console.log('Mapping issues to cards, issues:', issues);
    return issues.map((issue) => {
      // Handle direct API response format
      const title = issue.taskName || issue.title || '';
      const description = issue.taskDescription || issue.description || '';
      const status = this.normalizeStatus(issue.status);

      console.log(
        `Issue ${issue.id} status: ${issue.status} -> normalized: ${status}`
      );

      const card = {
        id: issue.id,
        ordinalId: this.getOrdinalIdFromKey(issue.key || ''),
        title: title,
        description: description,
        columnId: this.mapStatusToColumnId(status),
        priority: this.normalizePriority(issue.priority) || 'Medium',
        type: this.mapIssueTypeToCardType(issue.type || 'Task'),
        assigneeId: issue.assignee?.id || issue.assignedTo?.id || '',
        reporterId: issue.reporter?.id || '',
        labels: issue.labels || [],
        environment: '',
        startDate: issue.startDate
          ? new Date(issue.startDate).toISOString()
          : '',
        dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString() : '',
        storyPoints: issue.storyPoints || 0,
        createdAt:
          issue.created?.toISOString() ||
          issue.createdAt ||
          new Date().toISOString(),
        updatedAt:
          issue.updated?.toISOString() ||
          issue.updatedAt ||
          new Date().toISOString(),
      };

      console.log(
        `Mapped to card with title: ${card.title}, columnId: ${card.columnId}`
      );
      return card;
    });
  }

  // Helper method to normalize status values
  private normalizeStatus(status: string): string {
    if (!status) return 'To Do';

    switch (status.toUpperCase()) {
      case 'TODO':
      case 'TO_DO':
      case 'TO DO':
      case 'CREATED':
        return 'To Do';
      case 'IN_PROGRESS':
      case 'INPROGRESS':
        return 'In Progress';
      case 'REVIEW':
        return 'Review';
      case 'DONE':
      case 'COMPLETED':
        return 'Done';
      default:
        return 'To Do';
    }
  }

  // Helper method to normalize priority values
  private normalizePriority(priority: string): string {
    if (!priority) return 'Medium';

    if (typeof priority === 'string') {
      switch (priority.toUpperCase()) {
        case 'HIGHEST':
          return 'Highest';
        case 'HIGH':
          return 'High';
        case 'MEDIUM':
          return 'Medium';
        case 'LOW':
          return 'Low';
        case 'LOWEST':
          return 'Lowest';
        default:
          return 'Medium';
      }
    }

    return priority; // If already in correct format
  }

  private getOrdinalIdFromKey(key: string): number {
    if (!key) return 0;
    const parts = key.split('-');
    if (parts.length < 2) return 0;
    const num = parseInt(parts[1]);
    return isNaN(num) ? 0 : num;
  }

  private mapStatusToColumnId(status: string): string {
    switch (status) {
      case 'To Do':
        return 'todo';
      case 'In Progress':
        return 'inprogress';
      case 'Review':
        return 'review';
      case 'Done':
        return 'done';
      default:
        return 'todo';
    }
  }

  private mapColumnIdToStatus(
    columnId: string
  ): 'To Do' | 'In Progress' | 'Review' | 'Done' {
    switch (columnId) {
      case 'todo':
        return 'To Do';
      case 'inprogress':
        return 'In Progress';
      case 'review':
        return 'Review';
      case 'done':
        return 'Done';
      default:
        return 'To Do';
    }
  }

  private mapIssueTypeToCardType(type: string): CardTypesEnum {
    switch (type) {
      case 'Bug':
        return CardTypesEnum.BUG;
      case 'Story':
        return CardTypesEnum.STORY;
      default:
        return CardTypesEnum.TASK;
    }
  }

  private mapCardTypeToIssueType(
    type: CardTypesEnum
  ): 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task' {
    switch (type) {
      case CardTypesEnum.BUG:
        return 'Bug';
      case CardTypesEnum.STORY:
        return 'Story';
      default:
        return 'Task';
    }
  }

  private mapCardPriorityToIssuePriority(
    priority: string
  ): 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' {
    switch (priority) {
      case 'Highest':
        return 'Highest';
      case 'High':
        return 'High';
      case 'Medium':
        return 'Medium';
      case 'Low':
        return 'Low';
      case 'Lowest':
        return 'Lowest';
      default:
        return 'Medium';
    }
  }
}
