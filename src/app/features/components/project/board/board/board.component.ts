import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { filter, map, takeUntil } from 'rxjs/operators';
import { NzModalRef } from 'ng-zorro-antd/modal/modal-ref';
import { Column } from '../../../../../core/models';
import { CardDetailsComponent } from '../../card/card-details/card-details.component';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { BoardColumnComponent } from '../board-column/board-column.component';
import { AsyncPipe, CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BoardService } from '../../../../../core/services';
import { Store, select } from '@ngrx/store';
import * as fromStore from '../../../../../core/store';
import { ProjectService } from '../../../../../core/services/project.service';
import { SprintService } from '../../../../../features/services/sprint.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { CompleteSprintComponent } from '../../shared/complete-sprint/complete-sprint.component';
import { HttpClient } from '@angular/common/http';
import { of, switchMap, map as rxjsMap } from 'rxjs';
import { BASE_URL } from '../../../../../core/constants/api.const';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { TeamRole } from '../../../../../core/models/team-role.model';
import { PermissionService } from '../../../../../core/services/permission.service';

@Destroyable()
@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    BoardColumnComponent,
    AsyncPipe,
    NzDropDownModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    FormsModule,
    NzToolTipModule,
    NzBadgeModule,
    CompleteSprintComponent
  ],
  providers: [NzModalService, NzMessageService],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
})
export class BoardComponent implements OnInit {
  columns$!: Observable<Array<Column>>;
  modalRef!: NzModalRef;
  isLoading = true;
  error: string | null = null;
  currentProject: any;
  currentSprint: any;
  activeSprints: any[] = [];
  planningSprints: any[] = [];
  private modalClosing = new Subject<void>();
  showCompleteSprintModal = false;
  isCompletingSprint = false;

  // Permission related properties
  userTeamRole: TeamRole = TeamRole.MEMBER;
  canManageSprints = false;

  constructor(
    private store: Store<fromStore.AppState>,
    private activatedRoute: ActivatedRoute,
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private router: Router,
    private boardService: BoardService,
    private projectService: ProjectService,
    private sprintService: SprintService,
    private message: NzMessageService,
    private http: HttpClient,
    private notification: NzNotificationService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    // Load user permissions first
    this.loadUserPermissions();

    this.initializeBoard();
    this.handleQueryParams();

    // Subscribe to changes in the current selected sprint
    this.sprintService.currentSelectedSprint$
      .pipe(
        filter((sprint) => !!sprint), // Only proceed if there's a valid sprint
        takeUntilDestroyed(this)
      )
      .subscribe((sprint) => {
        console.log('Board received new active sprint:', sprint);
        if (sprint && sprint.id && this.currentSprint?.id !== sprint.id) {
          this.currentSprint = sprint;
          // this.message.info(`Loading board for sprint: ${sprint.name}`);
          this.loadBoardData(); // Reload the board data for the new sprint
        }
      });
  }

  // Add method to load user permissions
  private loadUserPermissions(): void {
    this.permissionService.getCurrentTeamRole().subscribe(role => {
      if (role) {
        this.userTeamRole = role;

        // Check if user can manage sprints
        this.permissionService.canManageSprint(role).subscribe(can => {
          this.canManageSprints = can;
        });
      }
    });
  }

  private handleQueryParams(): void {
    // Listen for query params to open card details
    this.activatedRoute.queryParams
      .pipe(
        filter((params) => !this.modalClosing.observed), // Only process if we're not in the closing sequence
        filter((params) => params && params['selectedIssue']),
        map((params) => params['selectedIssue']),
        takeUntilDestroyed(this)
      )
      .subscribe((id) => {
        this.store.dispatch(fromStore.setSelectedCardId({ id }));
        this.openCardDetailsModal(id);
      });
  }

  private initializeBoard(): void {
    this.isLoading = true;
    this.error = null;

    // Get the current project
    this.projectService.selectedProject$
      .pipe(takeUntilDestroyed(this))
      .subscribe((project) => {
        this.currentProject = project;

        if (!project || !project.id) {
          this.error =
            'No project selected. Please select a project to view its board.';
          this.isLoading = false;
          return;
        }

        // Find active sprints for this project
        this.sprintService
          .getSprintsByProjectId(project.id)
          .pipe(takeUntilDestroyed(this))
          .subscribe({
            next: (sprints) => {
              const activeSprints = sprints.filter(
                (sprint) => sprint.status === 'active'
              );
              this.activeSprints = activeSprints;

              this.currentSprint = this.activeSprints[0];

              // Get planning sprints
              this.planningSprints = sprints.filter(
                (sprint) => sprint.status === 'planning'
              );

              if (activeSprints.length === 0) {
                this.error =
                  'No active sprint found. Please start a sprint to see the board.';
                this.isLoading = false;
                return;
              }

              // Get the current selected sprint from SprintService or use the first active sprint
              const currentSelectedSprint =
                this.sprintService.getCurrentSprint();

              if (
                currentSelectedSprint &&
                currentSelectedSprint.status === 'active' &&
                activeSprints.some((s) => s.id === currentSelectedSprint.id)
              ) {
                this.currentSprint = currentSelectedSprint;
              } else {
                // Use the first active sprint if no valid sprint is selected
                this.currentSprint = activeSprints[0];
                this.sprintService.setCurrentSprint(this.currentSprint);
              }

              // Load columns and cards
              this.loadBoardData();
            },
            error: (err) => {
              this.error = 'Failed to load sprint data. Please try again.';
              this.isLoading = false;
              console.error('Error loading sprints:', err);
            },
          });
      });
  }

  private loadBoardData(): void {
    console.log('Loading board data for sprint:', this.currentSprint?.name);

    // Load columns
    this.columns$ = this.boardService.getBoardColumns();

    // Clear previously loaded cards
    this.store.dispatch(fromStore.getCards());

    // Load other data
    this.store.dispatch(fromStore.getColumns());
    this.store.dispatch(fromStore.getUsers());
    this.store.dispatch(fromStore.getLabels());
    this.store.dispatch(fromStore.getComments());

    // Get columns from store
    this.columns$ = this.store.pipe(select(fromStore.allColumns));

    this.isLoading = false;
  }

  openCardDetailsModal(id: string): void {
    // Close any existing modal first
    if (this.modalRef) {
      this.modalRef.close();
    }

    const cardComponent = this.modal.create({
      nzContent: CardDetailsComponent,
      nzClosable: false,
      nzAutofocus: null,
      nzViewContainerRef: this.viewContainerRef,
      nzWidth: '85%',
      nzFooter: null,
      nzStyle: { top: '5%' },
      // Do not close on navigation events
      nzMaskClosable: false,
      // Pass data to component using nzData instead of nzComponentParams
      nzData: {
        onClose: () => this.handleModalClose(),
      },
    });

    this.modalRef = cardComponent;

    // Handle close from the component
    cardComponent.afterClose.subscribe(() => {
      // Signal we're in closing mode
      this.modalClosing.next();

      // Clear selection in state
      this.store.dispatch(fromStore.setSelectedCardId({ id: null }));

      // Navigate only if we have an issue in the URL params
      if (this.activatedRoute.snapshot.queryParams['selectedIssue']) {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { selectedIssue: null },
          queryParamsHandling: 'merge',
        });
      }

      // Reset closing state after navigation completes
      setTimeout(() => {
        this.modalClosing.complete();
        this.modalClosing = new Subject<void>();
      }, 100);
    });
  }

  handleModalClose(): void {
    if (this.modalRef) {
      this.modalRef.close();
    }
  }

  startSprint(): void {
    if (!this.currentProject || !this.currentProject.id) {
      // this.message.error('No project selected');
      this.notification.error(
        'Error',
        `No project selected!`,
        { nzDuration: 3000 }
      );
      return;
    }

    // First check if there's a planning sprint
    this.sprintService
      .getSprintsByProjectId(this.currentProject.id)
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: (sprints) => {
          const planningSprint = sprints.find(
            (sprint) => sprint.status === 'planning'
          );

          if (planningSprint && planningSprint.id) {
            // Start this sprint
            this.sprintService.startSprint(planningSprint.id).subscribe({
              next: () => {
                // this.message.success('Sprint started successfully');
                this.notification.success(
                  'Success',
                  `Sprint started successfully!`,
                  { nzDuration: 3000 }
                );
                this.initializeBoard(); // Reload board data
              },
              error: (err) => {
                // this.message.error('Failed to start sprint');
                this.notification.error(
                  'Error',
                  `Failed to start sprint!`,
                  { nzDuration: 3000 }
                );
                console.error('Error starting sprint:', err);
              },
            });
          } else {
            // Create and start a new sprint
            const newSprint = {
              name: `Sprint ${sprints.length + 1}`,
              goal: 'Complete sprint tasks',
              status: 'active' as const,
              startDate: new Date(),
              endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks later
            };

            this.sprintService
              .createSprint(this.currentProject.id, newSprint)
              .subscribe({
                next: () => {
                  // this.message.success('New sprint created and started');
                  this.notification.success(
                    'Success',
                    `New sprint created and started!`,
                    { nzDuration: 3000 }
                  );
                  this.initializeBoard(); // Reload board data
                },
                error: (err) => {
                  // this.message.error('Failed to create sprint');
                  this.notification.error(
                    'Error',
                    `Failed to create sprint!`,
                    { nzDuration: 3000 }
                  );
                  console.error('Error creating sprint:', err);
                },
              });
          }
        },
        error: (err) => {
          // this.message.error('Failed to load sprints');
          this.notification.error(
            'Error',
            `Failed to load sprints!`,
            { nzDuration: 3000 }
          );
          console.error('Error loading sprints:', err);
        },
      });
  }

  completeSprint(): void {
    if (!this.currentSprint || !this.currentSprint.id) {
      // this.message.error('No active sprint to complete');
      this.notification.error(
        'Error',
        `No active sprint to complete!`,
        { nzDuration: 3000 }
      );
      return;
    }
    this.showCompleteSprintModal = true;
  }

  handleCompleteSprintConfirm(moveToSprintId: string): void {
    this.isCompletingSprint = true;

    this.sprintService.completeSprint(this.currentSprint.id).subscribe({
      next: () => {
        // this.message.success('Sprint completed successfully');
        this.notification.success(
          'Success',
          `Sprint completed successfully!`,
          { nzDuration: 3000 }
        );

        // Remove the completed sprint from active sprints
        this.activeSprints = this.activeSprints.filter(
          (sprint) => sprint.id !== this.currentSprint.id
        );

        // If there are still active sprints, select the first one
        if (this.activeSprints.length > 0) {
          this.currentSprint = this.activeSprints[0];
          this.sprintService.setCurrentSprint(this.currentSprint);
          this.loadBoardData();
        } else {
          // No more active sprints
          this.currentSprint = null;
          this.sprintService.setCurrentSprint(null);
          this.error =
            'No active sprint found. Please start a sprint to see the board.';
        }

        this.isCompletingSprint = false;
        this.showCompleteSprintModal = false;
      },
            error: (err) => {        this.notification.error(          'Error',          'Failed to complete sprint',          { nzDuration: 3000 }        );        console.error('Error completing sprint:', err);        this.isCompletingSprint = false;      },
    });
  }

  handleCompleteSprintCancel(): void {
    this.showCompleteSprintModal = false;
  }

  handleStartSprint(data: {id: string, goal?: string}): void {
    // Update sprint goal if provided
    if (data.goal) {
      const sprintToUpdate = this.planningSprints.find(sprint => sprint.id === data.id);
      if (sprintToUpdate) {
        sprintToUpdate.goal = data.goal;
        // Here you would typically update the sprint in the backend
        // But for simplicity we'll just start it with the updated goal
      }
    }

    // Start the sprint
    this.sprintService.startSprint(data.id).subscribe({
            next: (startedSprint) => {        this.notification.success(          'Success',          'Sprint started successfully',          { nzDuration: 3000 }        );        // Refresh sprint lists instead of closing the modal
        this.refreshSprintLists();

        // If no active sprint is set, set this one as active
        if (!this.currentSprint) {
          this.currentSprint = startedSprint;
          this.sprintService.setCurrentSprint(startedSprint);
          this.loadBoardData();
        }
      },
      error: (err) => {
        this.message.error('Failed to start sprint');
        console.error('Error starting sprint:', err);
      }
    });
  }

  handleCreateSprint(data: {name: string, goal: string}): void {
    if (!this.currentProject || !this.currentProject.id) {
      this.message.error('No project selected');
      return;
    }

    // Get board ID from project before creating sprint
    this.http.get<any>(`${BASE_URL}/projects/${this.currentProject.id}`)
      .pipe(
        switchMap((project) => {
          if (project.boards && project.boards.length > 0) {
            const boardId = project.boards[0].id;
            console.log('Found board ID for project:', boardId);
            return of(boardId);
          } else {
            console.log('No boards found, creating default board');
            return this.http.post<any>(
              `${BASE_URL}/projects/${this.currentProject.id}/create-default-board`,
              {}
            ).pipe(
              rxjsMap(board => {
                console.log('Created default board:', board);
                return board?.id;
              })
            );
          }
        })
      )
      .subscribe({
        next: (boardId) => {
          if (!boardId) {
            this.message.error('Could not find or create board for this project');
            return;
          }

          const newSprint = {
            name: data.name,
            goal: data.goal,
            status: 'planning' as const
          };

          // Now create sprint with the correct board ID
          this.sprintService.createSprint(boardId, newSprint).subscribe({
            next: () => {
              this.message.success('New sprint created');

              // After creating a sprint, refresh the planning sprints list but keep modal open
              this.refreshSprintLists();

              // Send an event to reset the form in the component
              const completeSprintComponent = document.querySelector('app-complete-sprint');
              if (completeSprintComponent) {
                // Using a custom event to reset the form
                completeSprintComponent.dispatchEvent(new CustomEvent('resetCreateForm'));
              }
            },
            error: (err) => {
              this.message.error('Failed to create sprint');
              console.error('Error creating sprint:', err);
            }
          });
        },
        error: (err) => {
          this.message.error('Failed to get board information');
          console.error('Error getting board info:', err);
        }
      });
  }

  // Helper method to refresh sprint lists
  private refreshSprintLists(): void {
    if (!this.currentProject || !this.currentProject.id) return;

    this.sprintService.getSprintsByProjectId(this.currentProject.id)
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: (sprints) => {
          this.activeSprints = sprints.filter(sprint => sprint.status === 'active');
          this.planningSprints = sprints.filter(sprint => sprint.status === 'planning');
        },
        error: (err) => {
          console.error('Error refreshing sprints:', err);
        }
      });
  }

  // Method to switch to a different active sprint
  switchActiveSprint(sprint: any): void {
    console.log('Switching to sprint:', sprint);
    if (sprint && sprint.id) {
      this.currentSprint = sprint;

      // First set loading state
      this.isLoading = true;

      // Set the current sprint in the sprint service
      this.sprintService.setCurrentSprint(sprint);

      // Show a better formatted toast notification
      this.message.success(`Switched to sprint: ${sprint.name}`, { nzDuration: 2000 });

      // Use setTimeout to ensure the sprint service has time to update
      setTimeout(() => {
        // Clear previous card data
        this.store.dispatch(fromStore.getCards());

        // Reload the board data for the new sprint
        this.loadBoardData();

        this.isLoading = false;
      }, 100);
    }
  }
}
