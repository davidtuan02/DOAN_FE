import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, AfterViewInit, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sprint } from '../../../../../features/services/sprint.service';
import { SprintService } from '../../../../../features/services/sprint.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';
import * as fromStore from '../../../../../core/store';

@Component({
  selector: 'app-complete-sprint',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="w-full max-w-md p-6 bg-white rounded-md shadow-xl overflow-y-auto" style="max-height: 500px;">
        <!-- Modal Header with Icon -->
        <div class="mb-4">
          <div class="flex items-center justify-center mb-2">
            <div class="p-3 rounded-full bg-cyan-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-10 h-10 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h2 class="mb-1 text-xl font-semibold text-center text-gray-800">
            Complete "{{ sprint?.name }}""
          </h2>
        </div>

        <!-- Sprint Summary -->
        <div class="mb-6">
          <p class="mb-4 text-gray-700">
            This sprint contains
            <strong
              >{{ getCompletedIssuesCount() }} completed work
              {{ getCompletedIssuesCount() === 1 ? "item" : "items" }}</strong
            >
            and
            <strong
              >{{ getOpenIssuesCount() }} open work
              {{ getOpenIssuesCount() === 1 ? "item" : "items" }}</strong
            >.
          </p>

          <ul class="mb-4 ml-2 text-sm text-gray-600 list-disc list-inside">
            <li class="mb-1">
              Complete sprint with goal: <strong>{{ sprint?.goal }}</strong>
            </li>
            <li class="mb-1">
              Completed work items includes everything in the last column on the
              board, <strong>DONE</strong>.
            </li>
            <!-- <li>
              Open work items will be moved to the backlog.
            </li> -->
          </ul>
        </div>

        <div class="mb-6" *ngIf="getOpenIssuesCount() > 0">
        <label
          for="move-to-sprint"
          class="block mb-2 text-sm font-medium text-gray-700"
        >
          Open work items will be moved to backlog
        </label>
        <!-- <select
          id="move-to-sprint"
          [(ngModel)]="moveToSprintId"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="backlog">Backlog</option>
          <option
            *ngFor="let sprint of getPlanningAndActiveSprints()"
            [value]="sprint.id"
          >
            {{ sprint.name }}
          </option>
        </select> -->
      </div>

        <!-- Planning Sprints Section - Only visible for users with permission -->
        <div class="mb-6 border-t pt-4" *ngIf="canCreateSprint">
          <h3 class="mb-3 text-md font-medium text-gray-700">Next Sprint:</h3>

          <div *ngIf="planningSprints.length > 0">
            <div class="mb-4">
              <label
                for="next-sprint"
                class="block mb-2 text-sm font-medium text-gray-700"
              >
                Select sprint to start next
              </label>
              <select
                id="next-sprint"
                [(ngModel)]="selectedPlanningSprint"
                (ngModelChange)="onSprintSelected()"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option [ngValue]="null">-- Select a sprint --</option>
                <option
                  *ngFor="let sprint of planningSprints"
                  [ngValue]="sprint"
                >
                  {{ sprint.name }} ({{ sprint.goal }})
                </option>
              </select>
            </div>

            <div *ngIf="selectedPlanningSprint" class="mb-4">
              <label
                for="update-goal"
                class="block mb-2 text-sm font-medium text-gray-700"
              >
                Update sprint goal (optional)
              </label>
              <input
                id="update-goal"
                type="text"
                [(ngModel)]="updatedSprintGoal"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sprint goal"
              />
            </div>

            <button
              *ngIf="selectedPlanningSprint"
              class="w-full py-2 mt-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              (click)="onStartSprint()"
            >
              Start Selected Sprint
            </button>
          </div>

          <div *ngIf="planningSprints.length === 0">
            <p class="mb-3 text-sm text-gray-600">No planning sprints available. Create a new one?</p>

            <div class="mb-4">
              <label
                for="new-sprint-name"
                class="block mb-2 text-sm font-medium text-gray-700"
              >
                New sprint name
              </label>
              <input
                id="new-sprint-name"
                type="text"
                [(ngModel)]="newSprintName"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sprint name"
              />
            </div>

            <div class="mb-4">
              <label
                for="new-sprint-goal"
                class="block mb-2 text-sm font-medium text-gray-700"
              >
                New sprint goal
              </label>
              <input
                id="new-sprint-goal"
                type="text"
                [(ngModel)]="newSprintGoal"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sprint goal"
              />
            </div>

            <button
              class="w-full py-2 mt-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              [disabled]="!newSprintName"
              (click)="onCreateSprint()"
            >
              Create New Sprint
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 border-t pt-4">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            (click)="onCancel()"
          >
            Cancel
          </button>
          <button
            [disabled]="isCompleting"
            class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            (click)="onConfirm()"
          >
            <span *ngIf="isCompleting" class="mr-2">
              <svg
                class="inline-block w-4 h-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
            Complete sprint
          </button>
        </div>
      </div>
    </div>
  `
})
export class CompleteSprintComponent implements OnChanges, AfterViewInit, OnDestroy, OnInit {
  @Input() visible = false;
  @Input() sprint: Sprint | null = null;
  @Input() availableSprints: Sprint[] = [];
  @Input() planningSprints: Sprint[] = [];
  @Input() isCompleting = false;
  @Input() canCreateSprint = false;
  @Input() projectId: string = '';

  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() startSprint = new EventEmitter<{id: string, goal?: string}>();
  @Output() createSprint = new EventEmitter<{name: string, goal: string}>();
  @Output() sprintCompleted = new EventEmitter<void>();
  @Output() sprintCancelled = new EventEmitter<void>();

  selectedPlanningSprint: Sprint | null = null;
  updatedSprintGoal = '';
  newSprintName = '';
  newSprintGoal = '';
  isCreatingSprint = false;
  private destroy$ = new Subject<void>();
  private resetFormHandler: (() => void) | null = null;

  constructor(
    private el: ElementRef,
    private sprintService: SprintService,
    private message: NzMessageService,
    private modal: NzModalService,
    private store: Store
  ) {
    console.log('he')
  }

  ngAfterViewInit(): void {
    // Listen for custom events to reset the form
    this.resetFormHandler = () => {
      this.resetCreateForm();
    };

    this.el.nativeElement.addEventListener('resetCreateForm', this.resetFormHandler);
  }

  ngOnDestroy(): void {
    // Clean up event listener
    if (this.resetFormHandler) {
      this.el.nativeElement.removeEventListener('resetCreateForm', this.resetFormHandler);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reset form fields when modal visibility changes
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.resetFormFields();
      // Refresh sprint data when modal becomes visible
      if (this.sprint?.id) {
        this.refreshSprintData(this.sprint.id);
      }
    }
  }

  ngOnInit(): void {
    // Subscribe to sprint changes
    this.sprintService.currentSelectedSprint$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(updatedSprint => {
      if (updatedSprint?.id && updatedSprint.id === this.sprint?.id) {
        this.refreshSprintData(updatedSprint.id);
      }
    });

    // Subscribe to card updates
    this.store.pipe(
      select(fromStore.selectCardState),
      takeUntil(this.destroy$)
    ).subscribe(cardState => {
      if (this.sprint?.id && !cardState.loading) {
        this.refreshSprintData(this.sprint.id);
      }
    });
  }

  private refreshSprintData(sprintId: string): void {
    this.sprintService.getSprintById(sprintId).subscribe(
      (updatedSprint) => {
        if (updatedSprint) {
          this.sprint = updatedSprint;
        }
      },
      (error) => {
        console.error('Error refreshing sprint data:', error);
      }
    );
  }

  resetFormFields(): void {
    this.selectedPlanningSprint = null;
    this.updatedSprintGoal = '';
    this.resetCreateForm();
  }

  resetCreateForm(): void {
    this.newSprintName = '';
    this.newSprintGoal = '';
  }

  getCompletedIssuesCount(): number {
    if (!this.sprint || !this.sprint.issues) return 0;
    return this.sprint.issues.filter((issue: any) => issue.status === 'DONE').length;
  }

  getOpenIssuesCount(): number {
    if (!this.sprint || !this.sprint.issues) return 0;
    return this.sprint.issues.filter((issue: any) => issue.status !== 'DONE').length;
  }

  onConfirm(): void {
    if (!this.sprint?.id) return;

    // Emit the moveToSprintId to parent component
    this.confirm.emit(this.selectedPlanningSprint?.id || '');
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onStartSprint() {
    if (!this.selectedPlanningSprint || !this.selectedPlanningSprint.id) return;

    const goal = this.updatedSprintGoal || this.selectedPlanningSprint.goal;
    this.startSprint.emit({
      id: this.selectedPlanningSprint.id,
      goal: goal
    });

    // Reset the selected sprint after starting
    this.selectedPlanningSprint = null;
    this.updatedSprintGoal = '';
  }

  onCreateSprint() {
    if (!this.newSprintName) return;

    this.createSprint.emit({
      name: this.newSprintName,
      goal: this.newSprintGoal
    });

    // Don't reset fields here as the parent component will trigger the reset
  }

  // Set the updatedSprintGoal when a sprint is selected
  onSprintSelected(): void {
    if (this.selectedPlanningSprint && this.selectedPlanningSprint.goal) {
      this.updatedSprintGoal = this.selectedPlanningSprint.goal;
    } else {
      this.updatedSprintGoal = '';
    }
  }
}
