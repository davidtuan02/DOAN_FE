import {
  Component,
  OnInit,
  HostListener,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
} from '@angular/forms';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { BacklogService, Issue, Sprint } from './backlog.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BASE_URL } from '../../../../core/constants/api.const';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, finalize, forkJoin } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { IssueService } from '../../../services/issue.service';
import { UserService } from '../../../../core/services/user.service';
import { CommentService, Comment } from '../../../services/comment.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzModalRef } from 'ng-zorro-antd/modal/modal-ref';
import { CardDetailsComponent } from '../../project/card/card-details/card-details.component';
import { Store } from '@ngrx/store';
import * as fromStore from '../../../../core/store';
import { CardTypesEnum } from '../../../../core/enums';
import { CreateCardFormComponent } from '../../project/card/create-card-form/create-card-form.component';
import { nanoid } from 'nanoid';
import { AssigneeFilterControlComponent } from '../../project/filter/assignee-filter-control/assignee-filter-control.component';
import { LabelFilterControlComponent } from '../../project/filter/label-filter-control/label-filter-control.component';
import { TypeFilterControlComponent } from '../../project/filter/type-filter-control/type-filter-control.component';
import { SvgIconComponent } from '../../../../shared/components';
import { CardFilter } from '../../../../core/models/card/card-filter';
import { takeUntilDestroyed } from '../../../../shared/utils';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { User } from '../../../../core/models';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-backlog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    CreateCardFormComponent,
    AssigneeFilterControlComponent,
    LabelFilterControlComponent,
    TypeFilterControlComponent,
    SvgIconComponent,
    NzSelectModule,
    AvatarComponent,
    NzToolTipModule
  ],
  templateUrl: './backlog.component.html',
  styleUrls: ['./backlog.component.scss'],
})
export class BacklogComponent implements OnInit {
  // Main data
  sprints: Sprint[] = [];
  backlogIssues: Issue[] = [];
  currentProjectId: string = '';
  currentProjectName: string = 'My Project';
  currentBoardId?: string;

  // UI state
  isLoading = true;
  searchQuery = '';
  viewMode: 'list' | 'board' = 'list';
  errorMessage: string = '';

  // Filters
  selectedPriority: 'All' | 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' =
    'All';
  selectedType: 'All' | 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task' = 'All';
  selectedStatus: 'All' | 'To Do' | 'In Progress' | 'Review' | 'Done' = 'All';
  selectedSprint: 'All' | string = 'All';
  selectedEpic: 'All' | string = 'All';

  // Modals
  showCreateSprintModal = false;
  showCreateIssueModal = false;

  // New item templates
  newSprint: Partial<Sprint> = {
    name: '',
    goal: '',
    startDate: undefined,
    endDate: undefined,
  };
  newIssue: Partial<Issue> = {
    type: 'Task',
    priority: 'Medium',
    status: 'To Do',
    storyPoints: 0,
  };

  // Sorting
  sortBy: 'priority' | 'created' | 'updated' | 'key' = 'priority';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Issue types filter
  showEpicsOnly = false;
  showStoriesOnly = false;
  showTasksOnly = false;
  showBugsOnly = false;

  // Selected issue for detail view
  selectedIssue: Issue | null = null;
  editingIssue: Partial<Issue> = {};
  isEditingTitle = false;
  isEditingDescription = false;

  // Connected drop lists
  connectedDropLists: string[] = ['backlog'];

  // New properties for createSprint
  isCreatingSprint = false;
  isSprintModalOpen = false;

  // Collapse state
  collapsedSprints: Set<string> = new Set();
  isBacklogCollapsed: boolean = false;

  // Menu state
  showSprintMenu: string | null = null;

  // Sprint editing state
  isEditingExistingSprint = false;
  sprintBeingEdited = '';

  // Track open status dropdown menus
  openStatusDropdown: string | null = null;

  // Assignee dropdown state
  showAssigneeDropdown = false;
  currentUserName = '';
  currentUserInitials = '';

  // Comments state
  comments: Comment[] = [];
  newCommentContent: string = '';
  editingCommentId: string | null = null;
  editingCommentContent: string = '';
  isLoadingComments = false;
  commentSortOrder: 'newest' | 'oldest' = 'newest';

  modalRef!: NzModalRef;

  // Filter form controls
  filterFormGroup: FormGroup;
  groupByControl: FormControl;
  clearFiltersVisible = false;

  // Sprint completion modal state
  showCompleteSprintModal = false;
  isCompletingSprint = false;
  sprintToComplete: Sprint | null = null;
  moveToSprintId: string = 'backlog';

  constructor(
    private backlogService: BacklogService,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private issueService: IssueService,
    public userService: UserService,
    private commentService: CommentService,
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private store: Store<fromStore.AppState>,
    private notification: NzNotificationService
  ) {
    // Initialize filter form controls
    this.groupByControl = new FormControl('None');
    this.filterFormGroup = new FormGroup({
      assignees: new FormControl([]),
      labels: new FormControl([]),
      types: new FormControl([]),
    });
  }

  ngOnInit(): void {
    this.isLoading = true;

    // Set current user info for assignee dropdown
    this.loadCurrentUserInfo();

    // Get current project ID from route or service
    const selectedProject = this.projectService.getSelectedProject();

    if (selectedProject && selectedProject.id) {
      this.currentProjectId = selectedProject.id;
      this.currentProjectName = selectedProject.name;
      // Call loadBoardIdFromProject which will then call initializeBacklog when done
      this.loadBoardIdFromProject().subscribe({
        next: (boardId) => {
          if (boardId) {
            this.currentBoardId = boardId;
            console.log('Found board ID:', this.currentBoardId);
            this.initializeBacklog();
          } else {
            console.warn('Board ID is undefined despite board being found');
            this.initializeBacklog();
          }
        },
        error: (err) => {
          console.error('Error fetching project boards:', err);
          // Still initialize even if we can't get the board ID
          this.initializeBacklog();
        },
      });
    } else {
      // Try to get project ID from query params
      this.route.queryParams.subscribe((params) => {
        if (params['projectId']) {
          this.currentProjectId = params['projectId'];

          // Fetch project details to get the name and boardId
          this.projectService.getProjectById(this.currentProjectId).subscribe({
            next: (project) => {
              this.currentProjectName = project.name;
              if (project.id) {
                // Call loadBoardIdFromProject which will then call initializeBacklog when done
                this.loadBoardIdFromProject().subscribe({
                  next: (boardId) => {
                    if (boardId) {
                      this.currentBoardId = boardId;
                      console.log('Found board ID:', this.currentBoardId);
                      this.initializeBacklog();
                    } else {
                      console.warn(
                        'Board ID is undefined despite board being found'
                      );
                      this.initializeBacklog();
                    }
                  },
                  error: (err) => {
                    console.error('Error fetching project boards:', err);
                    // Still initialize even if we can't get the board ID
                    this.initializeBacklog();
                  },
                });
              } else {
                this.isLoading = false;
                this.errorMessage = 'Project details are invalid.';
              }
            },
            error: (err) => {
              this.handleError(err, 'Failed to load project details');
            },
          });
        } else {
          this.isLoading = false;
          this.errorMessage =
            'No project selected. Please select a project first.';
        }
      });
    }

    // Setup filter form change listener
    this.filterFormGroup.valueChanges
      .pipe(
        takeUntilDestroyed(this),
        tap((filters) => this.updateFilters(filters))
      )
      .subscribe();
  }

  // Method to load the board ID from the project
  loadBoardIdFromProject(): Observable<string | null> {
    return this.http
      .get<any>(`${BASE_URL}/projects/${this.currentProjectId}`)
      .pipe(
        map((project) => {
          console.log('Project data received:', project);
          if (project.boards && project.boards.length > 0) {
            const boardId = project.boards[0].id;
            console.log('Retrieved board ID:', boardId);

            // Set the board ID in the service
            if (boardId) {
              this.backlogService.setBoardId(boardId);
            }

            return boardId;
          } else {
            console.warn('No boards found for project, creating default board');
            // Create a default board for the project
            return this.createDefaultBoard();
          }
        }),
        catchError((error) => {
          console.error('Error fetching project boards:', error);
          return of(null);
        })
      );
  }

  // Helper method to create a default board if none exists
  private createDefaultBoard(): Observable<string | null> {
    return this.http
      .post<any>(
        `${BASE_URL}/projects/${this.currentProjectId}/create-default-board`,
        {}
      )
      .pipe(
        map((board) => {
          console.log('Created default board:', board);
          if (board && board.id) {
            // Set the board ID in the service
            this.backlogService.setBoardId(board.id);
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

  private initializeBacklog(): void {
    // Initialize the backlog service with current project
    this.backlogService.setCurrentProject(this.currentProjectId);

    // Subscribe to sprints and backlog issues
    this.backlogService.getSprints().subscribe({
      next: (sprints) => {
        this.sprints = sprints;
        this.updateConnectedDropLists();
        this.isLoading = false;
      },
      error: (err) => {
        this.handleError(err, 'Failed to load sprints');
      },
    });

    this.backlogService.getBacklogIssues().subscribe({
      next: (issues) => {
        this.backlogIssues = issues;
        this.isLoading = false;
      },
      error: (err) => {
        this.handleError(err, 'Failed to load backlog issues');
      },
    });
  }

  private handleError(error: any, defaultMessage: string): void {
    this.isLoading = false;
    console.error(error);
    this.errorMessage = error?.error?.message || defaultMessage;
  }

  // Helper methods for template calculations
  updateConnectedDropLists(): void {
    this.connectedDropLists = ['backlog'];
    for (const sprint of this.sprints) {
      this.connectedDropLists.push('sprint-' + sprint.id);
    }
  }

  getSprintDropTargets(sprintId: string): string[] {
    const targets = ['backlog'];
    for (const sprint of this.sprints) {
      if (sprint.id !== sprintId) {
        targets.push('sprint-' + sprint.id);
      }
    }
    return targets;
  }

  getBacklogIssuesTotal(): number {
    return this.backlogIssues.reduce((sum, issue) => {
      return sum + (issue.storyPoints || 0);
    }, 0);
  }

  getBacklogIssuesCompleted(): number {
    return this.backlogIssues
      .filter((issue) => issue.status === 'Done')
      .reduce((sum, issue) => {
        return sum + (issue.storyPoints || 0);
      }, 0);
  }

  // Issue Detail Methods
  openIssueDetail(issue: Issue): void {
    // Close existing modal if open
    if (this.modalRef) {
      this.modalRef.close();
    }

    // Dispatch action to get users data if needed
    this.store.dispatch(fromStore.getUsers());

    // Map issue type to CardTypesEnum
    let cardType: CardTypesEnum;
    switch (issue.type) {
      case 'Bug':
        cardType = CardTypesEnum.BUG;
        break;
      case 'Story':
        cardType = CardTypesEnum.STORY;
        break;
      default:
        cardType = CardTypesEnum.TASK;
    }

    const card = {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      type: cardType,
      priority: issue.priority || 'Medium',
      status: issue.status || 'To Do',
      // Map IDs correctly
      assigneeId: issue.assignee?.id || '',
      reporterId: issue.reporter?.id || '',
      // Map columnId based on status
      columnId:
        issue.status === 'To Do'
          ? 'todo'
          : issue.status === 'In Progress'
          ? 'inprogress'
          : issue.status === 'Review'
          ? 'review'
          : issue.status === 'Done'
          ? 'done'
          : 'todo',
      // Parse ordinalId from key (e.g., "PROJECT-123" to 123)
      ordinalId: issue.key ? parseInt(issue.key.split('-')[1]) : 0,
      // Add other required fields
      labels: issue.labels || [],
      environment: '',
      storyPoints: issue.storyPoints || 0,
      startDate: issue.startDate ? new Date(issue.startDate).toISOString() : '',
      dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString() : '',
      createdAt: issue.created
        ? new Date(issue.created).toISOString()
        : new Date().toISOString(),
      updatedAt: issue.updated
        ? new Date(issue.updated).toISOString()
        : new Date().toISOString(),
    };

    // Dispatch action to create a temporary card in the store
    this.store.dispatch(fromStore.createCardSuccess({ card }));

    // Set the selected card in the store
    this.store.dispatch(fromStore.setSelectedCardId({ id: issue.id }));

    // Load other related data
    this.store.dispatch(fromStore.getComments());
    this.store.dispatch(fromStore.getLabels());

    // Open card details in modal
    const cardComponent = this.modal.create({
      nzContent: CardDetailsComponent,
      nzClosable: false,
      nzAutofocus: null,
      nzViewContainerRef: this.viewContainerRef,
      nzWidth: '85%',
      nzFooter: null,
      nzStyle: { top: '5%' },
      nzMaskClosable: false,
      nzData: {
        onClose: () => this.closeIssueDetail(),
      },
    });

    this.modalRef = cardComponent;

    // Update URL with selected issue
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { selectedIssue: issue.id },
      queryParamsHandling: 'merge',
    });
  }

  closeIssueDetail(): void {
    if (this.modalRef) {
      this.modalRef.close();
    }

    // Clear selection in store
    this.store.dispatch(fromStore.setSelectedCardId({ id: null }));

    // Remove from URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { selectedIssue: null },
      queryParamsHandling: 'merge',
    });
  }

  // Title Editing
  startEditingTitle(): void {
    this.isEditingTitle = true;
  }

  cancelEditingTitle(): void {
    this.isEditingTitle = false;
    if (this.selectedIssue) {
      this.editingIssue.title = this.selectedIssue.title;
    }
  }

  saveTitle(): void {
    if (this.selectedIssue && this.editingIssue.title) {
      const titleUpdate: Partial<Issue> = {
        title: this.editingIssue.title,
      };

      this.isLoading = true;
      this.issueService
        .updateIssue(this.selectedIssue.id, titleUpdate)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (updatedIssue) => {
            console.log('Title updated successfully:', updatedIssue);
            this.updateIssueInLists(updatedIssue);
            this.selectedIssue = updatedIssue;
            this.editingIssue = { ...updatedIssue };
            this.isEditingTitle = false;
            this.snackBar.open('Title updated successfully', 'Close', {
              duration: 3000,
            });
          },
          error: (err) => {
            console.error('Error updating title:', err);
            this.handleError(err, 'Failed to update title');
            this.editingIssue.title = this.selectedIssue!.title;
            this.isEditingTitle = false;
          },
        });
    }
  }

  // Description Editing
  startEditingDescription(): void {
    this.isEditingDescription = true;
  }

  cancelEditingDescription(): void {
    this.isEditingDescription = false;
    if (this.selectedIssue) {
      this.editingIssue.description = this.selectedIssue.description;
    }
  }

  saveDescription(): void {
    if (this.selectedIssue) {
      this.updateIssue(this.selectedIssue);
      this.isEditingDescription = false;
    }
  }

  saveDescriptionOnly(): void {
    if (this.selectedIssue && this.editingIssue) {
      const descriptionUpdate: Partial<Issue> = {
        description: this.editingIssue.description,
      };

      this.isLoading = true;
      this.issueService
        .updateIssue(this.selectedIssue.id, descriptionUpdate)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (updatedIssue) => {
            console.log('Description updated successfully:', updatedIssue);
            this.updateIssueInLists(updatedIssue);
            this.selectedIssue = updatedIssue;
            this.editingIssue = { ...updatedIssue };
            this.isEditingDescription = false;
            this.snackBar.open('Description updated successfully', 'Close', {
              duration: 3000,
            });
          },
          error: (err) => {
            console.error('Error updating description:', err);
            this.handleError(err, 'Failed to update description');
            this.editingIssue.description = this.selectedIssue!.description;
          },
        });
    }
  }

  // Save all changes to issue from the detail view
  saveIssueChanges(): void {
    if (!this.selectedIssue || !this.editingIssue) {
      this.snackBar.open('No issue selected or no changes to save', 'Close', {
        duration: 3000,
      });
      return;
    }

    // Create update object with the modified fields
    const changedFields: Partial<Issue> = {};

    // Important fields that we need to check explicitly
    const fieldsToCheck: (keyof Issue)[] = [
      'title',
      'description',
      'priority',
      'status',
      'type',
      'storyPoints',
    ];

    // Log what we're comparing
    console.log('Original issue:', this.selectedIssue);
    console.log('Edited issue:', this.editingIssue);

    // Compare important fields and record changes
    fieldsToCheck.forEach((field) => {
      if (
        this.editingIssue[field] !== undefined &&
        this.editingIssue[field] !== this.selectedIssue![field]
      ) {
        console.log(
          `Field ${field} changed from:`,
          this.selectedIssue![field],
          'to:',
          this.editingIssue[field]
        );
        (changedFields as any)[field] = this.editingIssue[field];
      }
    });

    // Compare all other fields
    Object.keys(this.editingIssue).forEach((key) => {
      const field = key as keyof Issue;
      if (
        !fieldsToCheck.includes(field as any) &&
        this.editingIssue[field] !== undefined &&
        this.editingIssue[field] !== this.selectedIssue![field]
      ) {
        console.log(
          `Other field ${field} changed from:`,
          this.selectedIssue![field],
          'to:',
          this.editingIssue[field]
        );
        (changedFields as any)[field] = this.editingIssue[field];
      }
    });

    // If no changes, don't make the API call
    if (Object.keys(changedFields).length === 0) {
      this.snackBar.open('No changes to save', 'Close', { duration: 3000 });
      return;
    }

    console.log('Saving changes to issue:', changedFields);

    this.isLoading = true;
    this.issueService
      .updateIssue(this.selectedIssue.id, changedFields)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (updatedIssue) => {
          console.log('Issue updated successfully:', updatedIssue);

          // Update all references to this issue
          this.updateIssueInLists(updatedIssue);

          // Update the selected and editing issue
          this.selectedIssue = updatedIssue;
          this.editingIssue = { ...updatedIssue };

          this.snackBar.open('Issue updated successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          console.error('Error updating issue:', err);
          this.handleError(err, 'Failed to update issue');
          // Reset editing issue to original values
          this.editingIssue = { ...this.selectedIssue };
        },
      });
  }

  // CRUD Operations
  createIssue(): void {
    if (!this.newIssue.title) {
      this.snackBar.open('Please enter a title for the issue', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isLoading = true;

    // Prepopulate fields if missing
    const issueToCreate = {
      ...this.newIssue,
      description: this.newIssue.description || '',
      priority: this.newIssue.priority || 'Medium',
      status: this.newIssue.status || 'To Do',
      type: this.newIssue.type || 'Task',
    };

    this.issueService
      .createIssue(this.currentProjectId, issueToCreate)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (createdIssue) => {
          console.log('Issue created successfully:', createdIssue);

          // Cập nhật state thống nhất qua backlogService thay vì thêm trực tiếp
          this.backlogService.updateLocalIssueState(createdIssue, 'create');

          // Reset form
          this.newIssue = {
            type: 'Task',
            priority: 'Medium',
            status: 'To Do',
            storyPoints: 0,
          };

          this.showCreateIssueModal = false;
          this.snackBar.open('Issue created successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          console.error('Error creating issue:', err);
          this.handleError(err, 'Failed to create issue');
        },
      });
  }

  updateIssue(issue: Issue): void {
    if (!issue || !issue.id) {
      this.snackBar.open('Invalid issue data', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;

    this.issueService
      .updateIssue(issue.id, issue)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (updatedIssue) => {
          console.log('Issue updated successfully:', updatedIssue);

          // Cập nhật state thống nhất qua backlogService thay vì cập nhật trực tiếp
          this.backlogService.updateLocalIssueState(updatedIssue, 'update');

          if (this.selectedIssue && this.selectedIssue.id === updatedIssue.id) {
            this.selectedIssue = updatedIssue;
            this.editingIssue = { ...updatedIssue };
          }

          this.snackBar.open('Issue updated successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          console.error('Error updating issue:', err);
          this.handleError(err, 'Failed to update issue');
        },
      });
  }

  deleteIssue(): void {
    if (this.selectedIssue) {
      const confirmDelete = confirm(
        `Are you sure you want to delete issue "${this.selectedIssue.title}"?`
      );

      if (confirmDelete) {
        this.isLoading = true;
        this.issueService
          .deleteIssue(this.selectedIssue.id)
          .pipe(finalize(() => (this.isLoading = false)))
          .subscribe({
            next: () => {
              console.log('Issue deleted successfully');

              // Lưu bản sao của selected issue trước khi nó bị xóa
              const deletedIssue = { ...this.selectedIssue! };

              // Cập nhật state thống nhất qua backlogService thay vì xóa trực tiếp
              this.backlogService.updateLocalIssueState(deletedIssue, 'delete');

              // Close the issue details panel
              this.closeIssueDetail();

              this.snackBar.open('Issue deleted successfully', 'Close', {
                duration: 3000,
              });
            },
            error: (err) => {
              console.error('Error deleting issue:', err);
              this.handleError(err, 'Failed to delete issue');
            },
          });
      }
    }
  }

  // Update issue status from dropdown
  updateIssueStatus(status: 'To Do' | 'In Progress' | 'Review' | 'Done'): void {
    if (!this.selectedIssue || !this.editingIssue) {
      this.snackBar.open('Cannot update: no issue selected', 'Close', {
        duration: 3000,
      });
      return;
    }

    // If status doesn't change, no need to call API
    if (status === this.selectedIssue.status) {
      return;
    }

    const oldStatus = this.selectedIssue.status;

    // Update UI first for smooth experience
    this.editingIssue.status = status;
    this.selectedIssue.status = status;

    // Show loading notification
    const loadingSnackbarRef = this.snackBar.open(
      `Updating status: ${oldStatus} → ${status}`,
      '',
      {
        duration: undefined,
      }
    );

    this.isLoading = true;
    this.issueService
      .updateIssueStatus(this.selectedIssue.id, status)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          loadingSnackbarRef.dismiss();
        })
      )
      .subscribe({
        next: (updatedIssue) => {
          // Update issue in all lists
          this.updateIssueInLists(updatedIssue);

          // Update in store for card details view consistency
          const card = this.convertIssueToCard(updatedIssue);
          this.store.dispatch(fromStore.updateCard({ partial: card }));

          this.snackBar.open(`Status updated to: ${status}`, 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          // Restore old status if error
          if (this.editingIssue) this.editingIssue.status = oldStatus;
          if (this.selectedIssue) this.selectedIssue.status = oldStatus;

          this.handleError(err, 'Failed to update status');
        },
      });
  }

  // Helper method to convert Issue to Card for store operations
  private convertIssueToCard(issue: Issue): any {
    // Map issue type to CardTypesEnum
    const cardType = this.mapIssueTypeToCardType(issue.type);

    return {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      type: cardType,
      priority: issue.priority || 'Medium',
      status: issue.status || 'To Do',
      assigneeId: issue.assignee?.id || '',
      reporterId: issue.reporter?.id || '',
      columnId:
        issue.status === 'To Do'
          ? 'todo'
          : issue.status === 'In Progress'
          ? 'inprogress'
          : issue.status === 'Review'
          ? 'review'
          : issue.status === 'Done'
          ? 'done'
          : 'todo',
      ordinalId: issue.key ? parseInt(issue.key.split('-')[1]) : 0,
      labels: issue.labels || [],
      environment: '',
      storyPoints: issue.storyPoints || 0,
      startDate: issue.startDate ? new Date(issue.startDate).toISOString() : '',
      dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString() : '',
      createdAt: issue.created
        ? new Date(issue.created).toISOString()
        : new Date().toISOString(),
      updatedAt: issue.updated
        ? new Date(issue.updated).toISOString()
        : new Date().toISOString(),
    };
  }

  // Helper to map Issue type to CardTypesEnum
  private mapIssueTypeToCardType(issueType: string): CardTypesEnum {
    switch (issueType) {
      case 'Bug':
        return CardTypesEnum.BUG;
      case 'Story':
        return CardTypesEnum.STORY;
      default:
        return CardTypesEnum.TASK;
    }
  }

  // New method for quick status update from the list view without opening details
  quickUpdateStatus(
    event: Event,
    issue: Issue,
    newStatus: 'To Do' | 'In Progress' | 'Review' | 'Done'
  ): void {
    event.stopPropagation(); // Prevent opening issue detail

    if (issue.status === newStatus) return;

    const oldStatus = issue.status;

    // Update UI immediately
    issue.status = newStatus;

    // Show loading notification
    const loadingSnackbarRef = this.snackBar.open(
      `Updating status: ${oldStatus} → ${newStatus}`,
      '',
      {
        duration: undefined,
      }
    );

    this.issueService
      .updateIssueStatus(issue.id, newStatus)
      .pipe(
        finalize(() => {
          loadingSnackbarRef.dismiss();
        })
      )
      .subscribe({
        next: (updatedIssue) => {
          // Update in lists
          this.updateIssueInLists(updatedIssue);

          // Update in store for consistency
          const card = this.convertIssueToCard(updatedIssue);
          this.store.dispatch(fromStore.updateCard({ partial: card }));

          this.snackBar.open(`Status updated to: ${newStatus}`, 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          // Revert UI change on error
          issue.status = oldStatus;
          this.handleError(err, 'Failed to update status');
        },
      });
  }

  // Assign issue to user
  assignToUser(issue: Issue, userId: string): void {
    if (userId) {
      this.isLoading = true;
      this.issueService
        .assignIssue(issue.id, userId)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (updatedIssue) => {
            this.updateIssueInLists(updatedIssue);

            // Update in store
            const card = this.convertIssueToCard(updatedIssue);
            this.store.dispatch(fromStore.updateCard({ partial: card }));

            this.snackBar.open('Issue assigned successfully', 'Close', {
              duration: 3000,
            });
          },
          error: (err) => {
            this.handleError(err, 'Failed to assign issue');
          },
        });
    }
  }

  // Improved method to update issue in all lists and store
  private updateIssueInLists(updatedIssue: Issue): void {
    // Check if issue is already in backlog
    const backlogIndex = this.backlogIssues.findIndex(
      (i) => i.id === updatedIssue.id
    );

    // Check if issue exists in any sprint and update it
    let foundInSprint = false;
    for (const sprint of this.sprints) {
      const sprintIssueIndex = sprint.issues.findIndex(
        (i) => i.id === updatedIssue.id
      );

      if (sprintIssueIndex >= 0) {
        // Issue already exists in this sprint, update it
        sprint.issues[sprintIssueIndex] = updatedIssue;
        foundInSprint = true;

        // Recalculate sprint metrics
        this.recalculateSprintMetrics(sprint);
        break;
      }
    }

    // If issue isn't in any sprint and isn't in backlog, add to backlog
    if (!foundInSprint && backlogIndex === -1) {
      this.backlogIssues.push(updatedIssue);
    } else if (backlogIndex >= 0) {
      // Update existing issue in backlog
      this.backlogIssues[backlogIndex] = updatedIssue;
    }

    // Update selectedIssue and editingIssue if needed
    if (this.selectedIssue && this.selectedIssue.id === updatedIssue.id) {
      this.selectedIssue = updatedIssue;
      this.editingIssue = { ...updatedIssue };
    }
  }

  // Helper method to recalculate sprint metrics
  private recalculateSprintMetrics(sprint: Sprint): void {
    sprint.totalStoryPoints = sprint.issues.reduce(
      (sum, issue) => sum + (issue.storyPoints || 0),
      0
    );

    sprint.completedStoryPoints = sprint.issues
      .filter((issue) => issue.status === 'Done')
      .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
  }

  // Improved method to remove issue from all lists and store
  private removeIssueFromLists(issueId: string): void {
    // Find issue in backlog first
    const backlogIssue = this.backlogIssues.find((i) => i.id === issueId);

    // Remove from backlog list
    this.backlogIssues = this.backlogIssues.filter((i) => i.id !== issueId);

    // Remove from sprint lists
    for (const sprint of this.sprints) {
      const issueToRemove = sprint.issues.find((i) => i.id === issueId);

      if (issueToRemove) {
        // Update sprint metrics before removing
        if (issueToRemove.storyPoints) {
          sprint.totalStoryPoints -= issueToRemove.storyPoints;

          if (issueToRemove.status === 'Done') {
            sprint.completedStoryPoints -= issueToRemove.storyPoints;
          }
        }

        // Remove the issue
        sprint.issues = sprint.issues.filter((i) => i.id !== issueId);
      }
    }
  }

  // Handle issue drag and drop
  drop(event: CdkDragDrop<Issue[]>): void {
    if (event.previousContainer === event.container) {
      // Move within the same container (reordering)
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update issue ordering in database - can be implemented in the future
      this.updateIssueOrders(event.container.id);
    } else {
      // Moving between containers (e.g., from backlog to sprint or vice versa)
      const movedIssue = event.previousContainer.data[event.previousIndex];

      // First update UI
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Save to backend
      if (event.container.id.startsWith('sprint-')) {
        // Moving to a sprint
        const sprintId = event.container.id.replace('sprint-', '');
        console.log(`Moving issue ${movedIssue.id} to sprint ${sprintId}`);

        this.isLoading = true;
        this.issueService
          .moveIssueToSprint(movedIssue.id, sprintId)
          .pipe(finalize(() => (this.isLoading = false)))
          .subscribe({
            next: (updatedIssue) => {
              console.log('Issue moved successfully:', updatedIssue);
              // Ensure the issue data is up to date
              this.updateIssueInLists(updatedIssue);

              this.snackBar.open('Issue moved to sprint', 'Close', {
                duration: 3000,
              });
            },
            error: (err) => {
              console.error('Error moving issue to sprint:', err);
              this.handleError(err, 'Failed to move issue');
              // Reload backlog to restore original state
              this.reloadBacklog();
            },
          });
      } else if (event.container.id === 'backlog') {
        // Moving to backlog (removing from sprint)
        console.log(`Moving issue ${movedIssue.id} to backlog`);

        this.isLoading = true;
        this.issueService
          .moveIssueToSprint(movedIssue.id, undefined)
          .pipe(finalize(() => (this.isLoading = false)))
          .subscribe({
            next: (updatedIssue) => {
              console.log('Issue moved to backlog successfully:', updatedIssue);
              // Ensure the issue data is up to date
              this.updateIssueInLists(updatedIssue);

              this.snackBar.open('Issue moved to backlog', 'Close', {
                duration: 3000,
              });
            },
            error: (err) => {
              console.error('Error moving issue to backlog:', err);
              this.handleError(err, 'Failed to move issue to backlog');
              // Reload backlog to restore original state
              this.reloadBacklog();
            },
          });
      }
    }
  }

  // Method to reload the entire backlog data
  private reloadBacklog(): void {
    // Reset any error states
    this.errorMessage = '';

    // Show loading indicator
    this.isLoading = true;

    // Refresh data through the service
    this.backlogService.refreshData();

    // Once data is refreshed, loading state will be updated by the subscription
  }

  // Helper methods for template calculations
  updateIssueOrders(containerId: string): void {
    // Future implementation: Update issue orders on backend
  }

  getFilteredIssues(issues: Issue[]): Issue[] {
    if (!issues) return [];

    // Get the filter values from the filterFormGroup
    const filterValues = this.filterFormGroup?.value || {
      assignees: [],
      labels: [],
      types: [],
    };
    const selectedAssignees = filterValues.assignees || [];
    const selectedLabels = filterValues.labels || [];
    const selectedTypes = filterValues.types || [];

    let filtered = [...issues];

    // Apply search filter
    if (this.searchQuery) {
      const searchLower = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.title?.toLowerCase().includes(searchLower) ||
          issue.description?.toLowerCase().includes(searchLower) ||
          issue.key?.toLowerCase().includes(searchLower)
      );
    }

    // Apply assignee filter
    if (selectedAssignees.length > 0) {
      filtered = filtered.filter(
        (issue) => issue.assignee && selectedAssignees.includes(issue.assignee)
      );
    }

    // Apply label filter
    if (selectedLabels.length > 0) {
      filtered = filtered.filter((issue) => {
        if (!issue.labels || issue.labels.length === 0) return false;
        return issue.labels.some((label) => selectedLabels.includes(label));
      });
    }

    // Apply type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(
        (issue) =>
          issue.type &&
          selectedTypes.includes(
            this.mapIssueTypeToCardType(issue.type).toString()
          )
      );
    }

    // Apply existing filters
    if (this.selectedPriority !== 'All') {
      filtered = filtered.filter(
        (issue) => issue.priority === this.selectedPriority
      );
    }

    if (this.selectedType !== 'All') {
      filtered = filtered.filter((issue) => issue.type === this.selectedType);
    }

    if (this.selectedStatus !== 'All') {
      filtered = filtered.filter(
        (issue) => issue.status === this.selectedStatus
      );
    }

    if (this.selectedEpic !== 'All') {
      filtered = filtered.filter((issue) => issue.epicId === this.selectedEpic);
    }

    return filtered;
  }

  getSprintStatusColor(status: string): string {
    switch (status) {
      case 'Planning':
        return 'bg-blue-500';
      case 'Active':
        return 'bg-green-500';
      case 'Completed':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case 'To Do':
        return 'bg-blue-500';
      case 'In Progress':
        return 'bg-yellow-500';
      case 'Review':
        return 'bg-purple-500';
      case 'Done':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  }

  getIssueTypeIcon(type: string): string {
    switch (type) {
      case 'Epic':
        return 'fa-bolt';
      case 'Story':
        return 'fa-book';
      case 'Task':
        return 'fa-check-square';
      case 'Bug':
        return 'fa-bug';
      case 'Sub-task':
        return 'fa-tasks';
      default:
        return 'fa-file';
    }
  }

  createSprint(): void {
    if (!this.newSprint.name?.trim()) {
      this.snackBar.open('Sprint name is required', 'Close', {
        duration: 3000,
      });
      return;
    }

    if (!this.newSprint.startDate || !this.newSprint.endDate) {
      this.snackBar.open('Sprint dates are required', 'Close', {
        duration: 3000,
      });
      return;
    }

    // Nếu đang chỉnh sửa sprint đã tồn tại
    if (this.isEditingExistingSprint && this.sprintBeingEdited) {
      this.updateSprint();
      return;
    }

    // Start loading state
    this.isCreatingSprint = true;

    // Check if we have a board ID, if not, get it first
    if (!this.currentBoardId) {
      console.log('Board ID not set, loading from project first');
      this.loadBoardIdFromProject().subscribe({
        next: (boardId) => {
          if (boardId) {
            this.currentBoardId = boardId;
            this.proceedWithSprintCreation();
          } else {
            this.isCreatingSprint = false;
            // this.snackBar.open(
            //   'Could not find board for this project',
            //   'Close',
            //   { duration: 3000 }
            // );
            this.notification.error(
            'Error',
            'Could not find board for this project!'
          )
          }
        },
        error: (err) => {
          this.isCreatingSprint = false;
          console.error('Error loading board ID:', err);
          // this.snackBar.open('Error loading board information', 'Close', {
          //   duration: 3000,
          // });
          this.notification.error(
            'Error',
            'Error loading board information!'
          )
        },
      });
    } else {
      // We already have a board ID, proceed with creation
      this.proceedWithSprintCreation();
    }
  }

  // New method to handle the actual sprint creation
  private proceedWithSprintCreation(): void {
    this.backlogService.createSprint(this.newSprint).subscribe({
      next: () => {
        this.isCreatingSprint = false;
        this.showCreateSprintModal = false;
        this.isEditingExistingSprint = false;
        this.sprintBeingEdited = '';
        // this.snackBar.open('Sprint created successfully', 'Close', {
        //   duration: 3000,
        // });
        this.notification.success(
            'Success',
            'Sprint created successfully!'
          )

        // Reset the form
        this.resetSprintForm();
      },
      error: (err) => {
        this.isCreatingSprint = false;
        console.error('Error creating sprint:', err);
        // this.snackBar.open(err.message || 'Error creating sprint', 'Close', {
        //   duration: 3000,
        // });
        this.notification.error(
            'Error',
            `${err.message} || 'Error creating sprint!`
          )
      },
    });
  }

  startSprint(sprintId: string): void {
    if (confirm('Are you sure you want to start this sprint?')) {
      this.isLoading = true;
      this.backlogService.startSprint(sprintId).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/board'])
        },
        error: (err) => {
          this.handleError(err, 'Failed to start sprint');
          this.isLoading = false;
        },
      });
    }
  }

  completeSprint(sprintId: string): void {
    // Find the sprint to complete
    const sprint = this.sprints.find((s) => s.id === sprintId);
    if (!sprint) {
      this.snackBar.open('Sprint not found', 'Close', { duration: 3000 });
      return;
    }

    // Set the sprint to complete and show the modal
    this.sprintToComplete = sprint;
    this.moveToSprintId = 'backlog'; // Default to backlog
    this.showCompleteSprintModal = true;
  }

  // Add methods to handle sprint completion

  // Count completed issues in a sprint (status = Done)
  getCompletedIssuesCount(sprint: Sprint | null): number {
    if (!sprint) return 0;
    return sprint.issues.filter((issue) => issue.status === 'Done').length;
  }

  // Count open issues in a sprint (status != Done)
  getOpenIssuesCount(sprint: Sprint | null): number {
    if (!sprint) return 0;
    return sprint.issues.filter((issue) => issue.status !== 'Done').length;
  }

  // Get planning and active sprints for the dropdown (excluding the current sprint)
  getPlanningAndActiveSprints(): Sprint[] {
    if (!this.sprintToComplete) return [];
    return this.sprints.filter(
      (sprint) =>
        (sprint.status === 'Planning' || sprint.status === 'Active') &&
        sprint.id !== this.sprintToComplete?.id
    );
  }

  // Handle cancel of sprint completion
  cancelCompleteSprint(): void {
    this.showCompleteSprintModal = false;
    this.sprintToComplete = null;
  }

  // Handle confirmation of sprint completion
  confirmCompleteSprint(): void {
    if (!this.sprintToComplete) {
      this.cancelCompleteSprint();
      return;
    }

    this.isCompletingSprint = true;

    // Get open issues to move
    const openIssues = this.sprintToComplete.issues.filter(
      (issue) => issue.status !== 'Done'
    );

    // First complete the sprint
    this.backlogService.completeSprint(this.sprintToComplete.id).subscribe({
      next: () => {
        // If there are open issues to move
        if (openIssues.length > 0) {
          this.moveOpenIssues(openIssues, this.moveToSprintId);
        } else {
          this.finalizeCompleteSprint();
        }
      },
      error: (err) => {
        this.handleError(err, 'Failed to complete sprint');
        this.isCompletingSprint = false;
      },
    });
  }

  // Move open issues to the selected sprint or backlog
  private moveOpenIssues(issues: any[], targetSprintId: string): void {
    const moveOperations: Observable<any>[] = [];

    issues.forEach((issue) => {
      if (targetSprintId === 'backlog') {
        // Move to backlog - update the issue to remove sprint association
        moveOperations.push(
          this.issueService.moveIssueToSprint(issue.id, undefined)
        );
      } else {
        // Move to another sprint
        moveOperations.push(
          this.issueService.moveIssueToSprint(issue.id, targetSprintId)
        );
      }
    });

    // Execute all move operations
    if (moveOperations.length > 0) {
      forkJoin(moveOperations).subscribe({
        next: () => {
          this.finalizeCompleteSprint();
        },
        error: (err) => {
          this.handleError(err, 'Failed to move some issues');
          this.finalizeCompleteSprint();
        },
      });
    } else {
      this.finalizeCompleteSprint();
    }
  }

  // Finalize the sprint completion process
  private finalizeCompleteSprint(): void {
    this.snackBar.open('Sprint completed successfully', 'Close', {
      duration: 3000,
    });
    this.isCompletingSprint = false;
    this.showCompleteSprintModal = false;
    this.sprintToComplete = null;
    this.reloadBacklog();
  }

  // Edit sprint method
  editSprint(sprint: Sprint): void {
    console.log('Editing sprint:', sprint);

    // Tạo một bản sao của sprint để chỉnh sửa
    this.newSprint = {
      ...sprint,
      // Đảm bảo các trường ngày tháng luôn là đối tượng Date
      startDate: sprint.startDate
        ? sprint.startDate instanceof Date
          ? sprint.startDate
          : new Date(sprint.startDate)
        : undefined,
      endDate: sprint.endDate
        ? sprint.endDate instanceof Date
          ? sprint.endDate
          : new Date(sprint.endDate)
        : undefined,
    };

    console.log('Prepared data for editing:', this.newSprint);

    // Đánh dấu rằng đang trong chế độ chỉnh sửa
    this.showCreateSprintModal = true;
    this.isEditingExistingSprint = true;
    this.sprintBeingEdited = sprint.id;
  }

  // Update existing sprint
  updateSprint(): void {
    if (!this.newSprint.name?.trim()) {
      this.snackBar.open('Sprint name is required', 'Close', {
        duration: 3000,
      });
      return;
    }

    if (!this.newSprint.startDate || !this.newSprint.endDate) {
      this.snackBar.open('Sprint dates are required', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isCreatingSprint = true;
    console.log('Updating sprint with data:', this.newSprint);
    console.log('Sprint ID being edited:', this.sprintBeingEdited);

    // Ensure dates are properly formatted
    const sprintData = {
      ...this.newSprint,
      // Ensure dates are Date objects
      startDate:
        this.newSprint.startDate instanceof Date
          ? this.newSprint.startDate
          : new Date(this.newSprint.startDate as string),
      endDate:
        this.newSprint.endDate instanceof Date
          ? this.newSprint.endDate
          : new Date(this.newSprint.endDate as string),
    };

    // Call service to update the sprint
    this.backlogService
      .updateSprint(this.sprintBeingEdited, sprintData)
      .subscribe({
        next: (response) => {
          this.isCreatingSprint = false;
          this.showCreateSprintModal = false;
          this.isEditingExistingSprint = false;
          this.sprintBeingEdited = '';
          this.snackBar.open('Sprint updated successfully', 'Close', {
            duration: 3000,
          });
          console.log('Sprint update successful:', response);

          // Reset the form
          this.resetSprintForm();
        },
        error: (err) => {
          this.isCreatingSprint = false;
          console.error('Error updating sprint:', err);
          let errorMessage = 'Error updating sprint';

          if (err.message) {
            errorMessage = err.message;
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }

          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
          });
        },
      });
  }

  // Calculate completion percentage for a sprint
  getCompletionPercentage(sprint: Sprint): number {
    if (!sprint.totalStoryPoints || sprint.totalStoryPoints === 0) {
      return 0;
    }
    return Math.round(
      (sprint.completedStoryPoints / sprint.totalStoryPoints) * 100
    );
  }

  // Add helper methods for Jira-style UI
  toggleSprintCollapse(sprintId: string): void {
    if (this.collapsedSprints.has(sprintId)) {
      this.collapsedSprints.delete(sprintId);
    } else {
      this.collapsedSprints.add(sprintId);
    }
  }

  isSprintCollapsed(sprintId: string): boolean {
    return this.collapsedSprints.has(sprintId);
  }

  toggleBacklogCollapse(): void {
    this.isBacklogCollapsed = !this.isBacklogCollapsed;
  }

  // Add helper methods for the template
  getDoneIssuesCount(sprint: Sprint): number {
    return sprint.issues
      ? sprint.issues.filter((i) => i.status === 'Done').length
      : 0;
  }

  getTodoIssuesCount(sprint: Sprint): number {
    return sprint.issues
      ? sprint.issues.filter((i) => i.status !== 'Done').length
      : 0;
  }

  getBacklogDoneIssuesCount(): number {
    return this.backlogIssues
      ? this.backlogIssues.filter((i) => i.status === 'Done').length
      : 0;
  }

  getBacklogTodoIssuesCount(): number {
    return this.backlogIssues
      ? this.backlogIssues.filter((i) => i.status !== 'Done').length
      : 0;
  }

  // Helper to get Jira-style date format
  formatJiraDate(date: string | Date | undefined): string {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
  }

  // Get sprint date range for display
  getSprintDateRange(sprint: Sprint): string {
    if (!sprint.startDate || !sprint.endDate) return '';
    return `${this.formatJiraDate(sprint.startDate)} - ${this.formatJiraDate(
      sprint.endDate
    )}`;
  }

  // Helper to format Date as YYYY-MM-DD for input[type="date"]
  getDateForInput(date: Date | string | undefined): string {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Date change event handlers
  onStartDateChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement && inputElement.valueAsDate) {
      this.newSprint.startDate = inputElement.valueAsDate;
    }
  }

  onEndDateChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement && inputElement.valueAsDate) {
      this.newSprint.endDate = inputElement.valueAsDate;
    }
  }

  // Reset the new sprint form
  resetSprintForm(): void {
    this.newSprint = {
      name: '',
      goal: '',
      startDate: undefined,
      endDate: undefined,
    };
  }

  // Methods for handling dropdown visibility
  toggleStatusDropdown(event: Event, issueId: string): void {
    event.stopPropagation();

    // Close dropdown if already open for this issue
    if (this.openStatusDropdown === issueId) {
      this.openStatusDropdown = null;
    } else {
      // Open dropdown for this issue
      this.openStatusDropdown = issueId;
    }
  }

  isStatusDropdownOpen(issueId: string): boolean {
    return this.openStatusDropdown === issueId;
  }

  // Close all dropdown menus
  closeAllDropdowns(): void {
    this.openStatusDropdown = null;
    this.showAssigneeDropdown = false;
  }

  // Document click handler to close all dropdowns when clicking outside
  @HostListener('document:click')
  documentClick(): void {
    this.closeAllDropdowns();
  }

  // Assign the current issue to the current user
  assignToMe(): void {
    if (!this.selectedIssue) {
      this.snackBar.open('No issue selected', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;

    // Get the current user ID from the UserService
    const currentUserId = this.userService.getCurrentUserId();

    if (!currentUserId) {
      this.snackBar.open('Cannot identify current user', 'Close', {
        duration: 3000,
      });
      this.isLoading = false;
      return;
    }

    // Check if current user is in the project team
    this.projectService
      .getProjectMembers(this.currentProjectId)
      .pipe(
        finalize(() => {
          // If we can't verify team membership, proceed with assignment anyway
          if (this.isLoading) {
            this.proceedWithAssignToMe(currentUserId);
          }
        })
      )
      .subscribe({
        next: (teamMembers: any[]) => {
          const isTeamMember = teamMembers.some(
            (user: any) => user.id === currentUserId
          );

          if (!isTeamMember) {
            this.isLoading = false;
            this.snackBar.open(
              'You are not a member of this project team',
              'Close',
              {
                duration: 3000,
              }
            );
            return;
          }

          this.proceedWithAssignToMe(currentUserId);
        },
        error: () => {
          // If we can't verify team membership, proceed with assignment anyway
          this.proceedWithAssignToMe(currentUserId);
        },
      });
  }

  // Helper method to proceed with self-assignment after team membership check
  private proceedWithAssignToMe(currentUserId: string): void {
    this.issueService
      .assignIssue(this.selectedIssue!.id, currentUserId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (updatedIssue) => {
          console.log('Issue assigned to current user:', updatedIssue);

          // Update the issue in all lists
          this.updateIssueInLists(updatedIssue);

          // Update the selected and editing issue
          this.selectedIssue = updatedIssue;
          this.editingIssue = { ...updatedIssue };

          this.snackBar.open('Issue assigned to you', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          console.error('Error assigning issue:', err);
          this.handleError(err, 'Failed to assign issue');
        },
      });
  }

  // Helper method to get initials from name
  getInitials(name?: string): string {
    if (!name) return '?';

    // If name contains spaces, assume it's a full name
    if (name.includes(' ')) {
      // Split the name by spaces
      const parts = name.split(' ');

      // Get first character of first and last parts
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];

      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    } else {
      // If it's a single word (likely user ID or username)
      return name.substring(0, 2).toUpperCase();
    }
  }

  // Load current user information for assignee dropdown
  private loadCurrentUserInfo(): void {
    const currentUser = this.userService.getCurrentUser().subscribe({
      next: (user) => {
        if (user) {
          this.currentUserName = `${user.firstName} ${user.lastName}`;
          this.currentUserInitials = this.getInitials(this.currentUserName);
        }
      },
      error: (err) => {
        console.error('Error loading current user:', err);
      },
    });
  }

  // Toggle assignee dropdown visibility
  toggleAssigneeDropdown(event: Event): void {
    event.stopPropagation();
    this.showAssigneeDropdown = !this.showAssigneeDropdown;

    // Close any other open dropdowns
    this.openStatusDropdown = null;
  }

  // Unassign the current issue
  unassignIssue(): void {
    if (!this.selectedIssue) {
      this.snackBar.open('No issue selected', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;

    // Call the API with a null or empty userId to unassign
    this.issueService
      .assignIssue(this.selectedIssue.id, '')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (updatedIssue) => {
          console.log('Issue unassigned successfully:', updatedIssue);

          // Update the issue in all lists
          this.updateIssueInLists(updatedIssue);

          // Update the selected and editing issue
          this.selectedIssue = updatedIssue;
          this.editingIssue = { ...updatedIssue };

          this.snackBar.open('Issue unassigned', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error unassigning issue:', err);
          this.handleError(err, 'Failed to unassign issue');
        },
      });
  }

  // Implement automatic assignment (randomly assign to a user on the project team)
  assignAutomatic(): void {
    if (!this.selectedIssue) {
      this.snackBar.open('No issue selected', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;

    // Get project team members instead of all users
    this.projectService.getProjectMembers(this.currentProjectId).subscribe({
      next: (teamMembers: any[]) => {
        // Exclude the current user
        const currentUserId = this.userService.getCurrentUserId();
        const eligibleUsers = teamMembers.filter(
          (user: any) => user.id !== currentUserId
        );

        if (eligibleUsers.length === 0) {
          // If no eligible team members, assign to current user
          this.assignToMe();
          this.isLoading = false;
          return;
        }

        // Pick a random user from the eligible team members
        const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
        const randomUser = eligibleUsers[randomIndex];

        // Assign to the randomly selected team member
        this.issueService
          .assignIssue(this.selectedIssue!.id, randomUser.id)
          .pipe(finalize(() => (this.isLoading = false)))
          .subscribe({
            next: (updatedIssue) => {
              console.log(
                'Issue automatically assigned to team member:',
                randomUser.firstName,
                randomUser.lastName
              );

              // Update the issue in all lists
              this.updateIssueInLists(updatedIssue);

              // Update the selected and editing issue
              this.selectedIssue = updatedIssue;
              this.editingIssue = { ...updatedIssue };

              this.snackBar.open(
                `Issue automatically assigned to ${randomUser.firstName} ${randomUser.lastName}`,
                'Close',
                { duration: 3000 }
              );
            },
            error: (err: any) => {
              console.error('Error auto-assigning issue:', err);
              this.handleError(err, 'Failed to auto-assign issue');
            },
          });
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error fetching team members for auto-assignment:', err);
        this.snackBar.open(
          'Failed to fetch team members for auto-assignment',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }

  // Loading comments for selected issue
  loadComments(): void {
    if (!this.selectedIssue) return;

    this.isLoadingComments = true;
    this.commentService
      .getCommentsByTaskId(this.selectedIssue.id)
      .pipe(finalize(() => (this.isLoadingComments = false)))
      .subscribe({
        next: (comments) => {
          this.comments = comments;
          this.sortComments();
        },
        error: (err) => {
          console.error('Error loading comments:', err);
          this.snackBar.open('Failed to load comments', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  // Add new comment
  addComment(): void {
    if (!this.selectedIssue || !this.newCommentContent.trim()) return;

    const newComment = {
      content: this.newCommentContent.trim(),
      taskId: this.selectedIssue.id,
    };

    this.isLoadingComments = true;
    this.commentService
      .createComment(newComment)
      .pipe(finalize(() => (this.isLoadingComments = false)))
      .subscribe({
        next: (comment) => {
          this.comments.unshift(comment);
          this.sortComments();
          this.newCommentContent = '';
          this.snackBar.open('Comment added', 'Close', { duration: 2000 });
        },
        error: (err) => {
          console.error('Error adding comment:', err);
          this.snackBar.open('Failed to add comment', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  // Start editing a comment
  startEditingComment(comment: Comment): void {
    this.editingCommentId = comment.id;
    this.editingCommentContent = comment.content;
  }

  // Cancel editing a comment
  cancelEditingComment(): void {
    this.editingCommentId = null;
    this.editingCommentContent = '';
  }

  // Save edited comment
  saveComment(commentId: string): void {
    if (!this.editingCommentContent.trim()) return;

    const updatedComment = {
      content: this.editingCommentContent.trim(),
    };

    this.isLoadingComments = true;
    this.commentService
      .updateComment(commentId, updatedComment)
      .pipe(finalize(() => (this.isLoadingComments = false)))
      .subscribe({
        next: (comment) => {
          const index = this.comments.findIndex((c) => c.id === commentId);
          if (index !== -1) {
            this.comments[index] = comment;
          }
          this.editingCommentId = null;
          this.editingCommentContent = '';
          this.snackBar.open('Comment updated', 'Close', { duration: 2000 });
        },
        error: (err) => {
          console.error('Error updating comment:', err);
          this.snackBar.open('Failed to update comment', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  // Delete a comment
  deleteComment(commentId: string): void {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.isLoadingComments = true;
      this.commentService
        .deleteComment(commentId)
        .pipe(finalize(() => (this.isLoadingComments = false)))
        .subscribe({
          next: () => {
            this.comments = this.comments.filter((c) => c.id !== commentId);
            this.snackBar.open('Comment deleted', 'Close', { duration: 2000 });
          },
          error: (err) => {
            console.error('Error deleting comment:', err);
            this.snackBar.open('Failed to delete comment', 'Close', {
              duration: 3000,
            });
          },
        });
    }
  }

  // Toggle comment sort order
  toggleCommentSortOrder(): void {
    this.commentSortOrder =
      this.commentSortOrder === 'newest' ? 'oldest' : 'newest';
    this.sortComments();
  }

  // Sort comments based on current sort order
  private sortComments(): void {
    this.comments.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return this.commentSortOrder === 'newest' ? bDate - aDate : aDate - bDate;
    });
  }

  /**
   * Handles creating a new card in the backlog
   */
  onCreateCardInBacklog(cardData: any): void {
    console.log('Creating card in backlog with data:', cardData);

    // First convert Card to Issue format
    const newIssue: Partial<Issue> = {
      title: cardData.title || '',
      type: this.mapCardTypeToIssueType(cardData.type || 'TASK'),
      description: '',
      priority: 'Medium',
      status: 'To Do',
      storyPoints: 0,
    };

    if (!newIssue.title || newIssue.title.trim() === '') {
      this.snackBar.open('Please enter a title for the issue', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isLoading = true;
    this.issueService
      .createIssue(this.currentProjectId, newIssue)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (createdIssue) => {
          console.log('Issue created successfully:', createdIssue);

          // Cập nhật state thống nhất qua backlogService thay vì thêm trực tiếp
          this.backlogService.updateLocalIssueState(createdIssue, 'create');

          this.snackBar.open('Issue created in backlog', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          console.error('Error creating issue:', err);
          this.handleError(err, 'Failed to create issue');
        },
      });
  }

  /**
   * Handles creating a new card in a specific sprint
   */
  onCreateCardInSprint(cardData: any, sprintId: string): void {
    const { title, description, type, priority, assignee } = cardData;

    // Create a new issue object
    const newIssue: Partial<Issue> = {
      title,
      description,
      type: this.mapCardTypeToIssueType(type),
      priority,
      status: 'To Do',
      labels: [],
      components: [],
    };

    // Add assignee if provided
    if (assignee) {
      newIssue.assignee = {
        id: assignee.id,
        name: assignee.name,
        avatar: assignee.avatar,
      };
    }

    // Create the issue
    this.isLoading = true;
    this.issueService
      .createIssue(this.currentProjectId, newIssue)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (createdIssue) => {
          console.log('Created issue:', createdIssue);

          // Then move the issue to the sprint
          this.issueService
            .moveIssueToSprint(createdIssue.id, sprintId)
            .subscribe({
              next: (updatedIssue) => {
                console.log('Moved to sprint:', updatedIssue);

                // Find the sprint and add the issue to it
                const targetSprint = this.sprints.find(
                  (s) => s.id === sprintId
                );
                if (targetSprint) {
                  targetSprint.issues.push(updatedIssue);
                  this.recalculateSprintMetrics(targetSprint);
                }

                this.snackBar.open('Issue created in sprint', 'Close', {
                  duration: 3000,
                });
              },
              error: (err) => {
                console.error('Error moving to sprint:', err);
                this.handleError(err, 'Failed to add issue to sprint');
              },
            });
        },
        error: (err) => {
          console.error('Error creating issue:', err);
          this.handleError(err, 'Failed to create issue');
        },
      });
  }

  /**
   * Converts CardTypesEnum to Issue type string
   */
  private mapCardTypeToIssueType(
    cardType: string
  ): 'Epic' | 'Story' | 'Task' | 'Bug' | 'Sub-task' {
    switch (cardType) {
      case CardTypesEnum.BUG:
        return 'Bug';
      case CardTypesEnum.STORY:
        return 'Story';
      case 'Bug':
        return 'Bug';
      case 'Story':
        return 'Story';
      case CardTypesEnum.TASK:
      default:
        return 'Task';
    }
  }

  updateFilters(filters: CardFilter): void {
    // Update filter logic
    const hasFilters = Object.values(filters).some(
      (value) => Array.isArray(value) && value.length > 0
    );
    this.clearFiltersVisible = hasFilters;

    // Apply filters to the issues
    this.reloadBacklog();
  }

  clearFilters(): void {
    this.filterFormGroup.reset({ assignees: [], labels: [], types: [] });
  }

  // Convert simple user objects to full User objects for avatar component
  convertToFullUser(user: any): User {
    if (!user) return null as any;

    return {
      id: user.id || '',
      createdAt: '',
      updatedAt: '',
      firstName: user.name ? user.name.split(' ')[0] : '',
      lastName: user.name ? user.name.split(' ').slice(1).join(' ') : '',
      email: '',
      age: 0,
      username: user.name || '',
      role: 'BASIC' as any,
      avatar: user.avatar || '',
    };
  }

  // Add deleteSprint method
  deleteSprint(sprintId: string): void {
    if (confirm('Are you sure you want to delete this sprint?')) {
      this.backlogService.deleteSprint(sprintId).subscribe({
        next: () => {
          this.notification.success(
            'Success',
            'Sprint deleted successfully!'
          )
          // this.snackBar.open('Sprint deleted successfully', 'Close', {
          //   duration: 3000,
          // });
        },
        error: (err) => {
          this.notification.error(
            'Error',
            'Sprint deleted failed!'
          )
          this.handleError(err, 'Failed to delete sprint');
        },
      });
    }
  }
}
