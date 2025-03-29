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

@Destroyable()
@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, BoardColumnComponent, AsyncPipe],
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
  private modalClosing = new Subject<void>();

  constructor(
    private store: Store<fromStore.AppState>,
    private activatedRoute: ActivatedRoute,
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private router: Router,
    private boardService: BoardService,
    private projectService: ProjectService,
    private sprintService: SprintService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.initializeBoard();
    this.handleQueryParams();
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

        // Find active sprint for this project
        this.sprintService
          .getSprintsByProjectId(project.id)
          .pipe(takeUntilDestroyed(this))
          .subscribe({
            next: (sprints) => {
              const activeSprint = sprints.find(
                (sprint) => sprint.status === 'active'
              );
              this.currentSprint = activeSprint;

              if (!activeSprint) {
                this.error =
                  'No active sprint found. Please start a sprint to see the board.';
                this.isLoading = false;
                return;
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
    // Load columns
    this.columns$ = this.boardService.getBoardColumns();

    // Load cards into store
    this.store.dispatch(fromStore.getCards());
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
      this.message.error('No project selected');
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
                this.message.success('Sprint started successfully');
                this.initializeBoard(); // Reload board data
              },
              error: (err) => {
                this.message.error('Failed to start sprint');
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
                  this.message.success('New sprint created and started');
                  this.initializeBoard(); // Reload board data
                },
                error: (err) => {
                  this.message.error('Failed to create sprint');
                  console.error('Error creating sprint:', err);
                },
              });
          }
        },
        error: (err) => {
          this.message.error('Failed to load sprints');
          console.error('Error loading sprints:', err);
        },
      });
  }

  completeSprint(): void {
    if (!this.currentSprint || !this.currentSprint.id) {
      this.message.error('No active sprint to complete');
      return;
    }

    this.sprintService.completeSprint(this.currentSprint.id).subscribe({
      next: () => {
        this.message.success('Sprint completed successfully');
        this.initializeBoard(); // Reload board data
      },
      error: (err) => {
        this.message.error('Failed to complete sprint');
        console.error('Error completing sprint:', err);
      },
    });
  }
}
