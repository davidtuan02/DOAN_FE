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

@Injectable({ providedIn: 'root' })
export class BoardService {
  private columnsSubject = new BehaviorSubject<Column[]>([]);
  private cardsSubject = new BehaviorSubject<Card[]>([]);
  private currentSprint$ = new BehaviorSubject<Sprint | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private apiUrl = `${BASE_URL}`;

  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public currentSprint = this.currentSprint$.asObservable();

  // Standard column definitions for JIRA-like workflow
  private readonly defaultColumns: Column[] = [
    {
      id: 'TODO',
      name: 'To Do',
      textColor: '#42526E',
      bgBadge: '#E9F5FE',
      bgButton: '#0052CC',
      color: '#0052CC',
    },
    {
      id: 'IN_PROGRESS',
      name: 'In Progress',
      textColor: '#42526E',
      bgBadge: '#E9F5FE',
      bgButton: '#0052CC',
      color: '#0052CC',
    },
    {
      id: 'REVIEW',
      name: 'Review',
      textColor: '#42526E',
      bgBadge: '#FFF0B3',
      bgButton: '#FF991F',
      color: '#FF991F',
    },
    {
      id: 'DONE',
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
    private userService: UserService
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
            // Find active sprint
            const activeSprint = sprints.find(
              (sprint) => sprint.status === 'active'
            );

            if (!activeSprint) {
              this.currentSprint$.next(null);
              this.errorSubject.next('No active sprint found');
              this.loadingSubject.next(false);
              // Return empty data
              return of({ columns: this.defaultColumns, cards: [] });
            }

            this.currentSprint$.next(activeSprint);

            // Get issues for the active sprint
            if (!activeSprint.id) {
              this.errorSubject.next('Active sprint has no ID');
              this.loadingSubject.next(false);
              return of({ columns: this.defaultColumns, cards: [] });
            }

            // Get issues for the project - ideally we would have an API to get issues by sprint directly
            return this.issueService.getIssuesByProjectId(project.id!).pipe(
              map((issues) => {
                // Filter issues that belong to the active sprint
                const sprintIssues = issues.filter(
                  (issue) => issue.sprintId === activeSprint.id
                );

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
    // Get the current project
    return this.projectService.selectedProject$.pipe(
      switchMap((project) => {
        const projectId = project?.id;
        if (!projectId) {
          console.warn('No project selected, cannot load board cards');
          return of([]);
        }

        // Get issues for the project
        return this.issueService.getIssuesByProjectId(projectId).pipe(
          map((issues) => this.mapIssuesToCards(issues)),
          catchError((error) => {
            console.error('Error loading board cards:', error);
            return of([]);
          })
        );
      })
    );
  }

  getUsers(): Observable<Array<User>> {
    return this.http.get<User[]>(`${this.apiUrl}/users/all`).pipe(
      tap((users) => console.log('Fetched users for board:', users.length)),
      catchError((error) => {
        console.error('Error fetching users:', error);
        return of([]);
      })
    );
  }

  createCard(card: Card): Observable<unknown> {
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

    return this.issueService.createIssue(currentProject.id, issue);
  }

  updateCard(card: PartialCard): Observable<unknown> {
    if (!card.id) {
      console.error('Cannot update card without id');
      return of({});
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
    if (card.assigneeId) {
      issueUpdate.assignee = { id: card.assigneeId, name: '', avatar: '' };
    }
    if (card.labels) issueUpdate.labels = card.labels;

    return this.issueService.updateIssue(card.id, issueUpdate);
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
    // This should fetch comments for all cards in the board
    // For now, we'll return an empty array and implement this later
    return of([]);
  }

  addComment(comment: Comment): Observable<unknown> {
    if (!comment.cardId) {
      console.error('Cannot add comment without card id');
      return of({});
    }

    // This would call a comment service or API endpoint
    // For now, we'll just simulate success
    return of({ success: true });
  }

  // Helper methods
  private mapIssuesToCards(issues: Issue[]): Card[] {
    return issues.map((issue) => {
      return {
        id: issue.id,
        ordinalId: this.getOrdinalIdFromKey(issue.key),
        title: issue.title,
        description: issue.description || '',
        columnId: this.mapStatusToColumnId(issue.status),
        priority: issue.priority || 'Medium',
        type: this.mapIssueTypeToCardType(issue.type || 'Task'),
        assigneeId: issue.assignee?.id || '',
        reporterId: issue.reporter?.id || '',
        labels: issue.labels || [],
        environment: '',
        startDate: issue.created?.toISOString() || new Date().toISOString(),
        dueDate: issue.dueDate?.toISOString() || '',
        createdAt: issue.created?.toISOString() || new Date().toISOString(),
        updatedAt: issue.updated?.toISOString() || new Date().toISOString(),
      };
    });
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
