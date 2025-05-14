import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { GoalService } from '../../../../../core/services/goal.service';
import { ProjectService } from '../../../../../core/services/project.service';
import { Goal, GoalStatus } from '../../../../../core/models/goal/goal.model';
import { takeUntilDestroyed } from '../../../../../shared/utils';
import { GoalFormComponent } from '../goal-form/goal-form.component';

@Component({
  selector: 'app-goals-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzProgressModule,
    NzToolTipModule,
    NzDropDownModule,
    NzCheckboxModule,
    GoalFormComponent,
  ],
  templateUrl: './goals-page.component.html',
  styleUrls: ['./goals-page.component.scss'],
})
export class GoalsPageComponent implements OnInit {
  goals: Goal[] = [];
  filteredGoals: Goal[] = [];
  loading = false;
  searchTerm = '';
  statusFilter: string[] = [];

  selectedGoal: Goal | null = null;

  constructor(
    private goalService: GoalService,
    private projectService: ProjectService,
    private modalService: NzModalService,
    private messageService: NzMessageService
  ) {}

  // Add new helper methods for template logic
  toggleStatusFilter(status: string): void {
    if (this.statusFilter.includes(status)) {
      this.statusFilter = this.statusFilter.filter((s) => s !== status);
    } else {
      this.statusFilter = [...this.statusFilter, status];
    }
    this.applyFilters();
  }

  clearSearchTerm(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    this.loading = true;
    const currentProject = this.projectService.getSelectedProject();

    if (!currentProject || !currentProject.id) {
      this.messageService.error('No project selected');
      this.loading = false;
      return;
    }

    this.goalService
      .getGoals(currentProject.id)
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: (goals) => {
          this.goals = goals;
          this.filteredGoals = [...goals];
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load goals', error);
          this.messageService.error('Failed to load goals');
          this.loading = false;
        },
      });
  }

  // Create a new goal
  createGoal(): void {
    const currentProject = this.projectService.getSelectedProject();

    if (!currentProject || !currentProject.id) {
      this.messageService.error('No project selected');
      return;
    }

    console.log('Creating goal for project:', currentProject.id);

    this.modalService
      .create({
        nzTitle: 'Create New Goal',
        nzContent: GoalFormComponent,
        nzData: {
          projectId: currentProject.id,
        },
        nzWidth: 600,
        nzFooter: null,
        nzMaskClosable: false,
      })
      .afterClose.subscribe((result) => {
        if (result) {
          this.loadGoals();
          this.messageService.success('Goal created successfully');
        }
      });
  }

  // Edit an existing goal
  editGoal(goal: Goal): void {
    this.modalService
      .create({
        nzTitle: 'Edit Goal',
        nzContent: GoalFormComponent,
        nzData: {
          projectId: goal.projectId,
          goal: goal,
          isEdit: true,
        },
        nzWidth: 600,
        nzFooter: null,
        nzMaskClosable: false,
      })
      .afterClose.subscribe((result) => {
        if (result) {
          this.loadGoals();
          this.messageService.success('Goal updated successfully');
        }
      });
  }

  // Delete a goal
  deleteGoal(goal: Goal): void {
    this.modalService.confirm({
      nzTitle: 'Are you sure you want to delete this goal?',
      nzContent: `This action cannot be undone. Goal: ${goal.title}`,
      nzOkText: 'Delete',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.goalService
          .deleteGoal(goal.id)
          .pipe(takeUntilDestroyed(this))
          .subscribe({
            next: () => {
              this.loadGoals();
              this.messageService.success('Goal deleted successfully');
            },
            error: (error) => {
              console.error('Failed to delete goal', error);
              this.messageService.error('Failed to delete goal');
            },
          });
      },
    });
  }

  // View goal details
  viewGoalDetails(goal: Goal): void {
    this.selectedGoal = goal;
    this.modalService.create({
      nzTitle: goal.title,
      nzContent: `
        <div class="goal-details">
          <p><strong>Description:</strong> ${
            goal.description || 'No description provided'
          }</p>
          <p><strong>Status:</strong> <span class="status-${goal.status.toLowerCase()}">${this.goalService.getStatusDisplay(
        goal.status
      )}</span></p>
          <p><strong>Progress:</strong> ${goal.progress}%</p>
          <p><strong>Start Date:</strong> ${
            goal.startDate
              ? new Date(goal.startDate).toLocaleDateString()
              : 'Not set'
          }</p>
          <p><strong>Due Date:</strong> ${
            goal.dueDate
              ? new Date(goal.dueDate).toLocaleDateString()
              : 'Not set'
          }</p>
          <p><strong>Project:</strong> ${goal.projectName}</p>
          <p><strong>Owner:</strong> ${goal.ownerName || 'Unassigned'}</p>
          <p><strong>Created:</strong> ${new Date(
            goal.createdAt
          ).toLocaleString()}</p>
          <p><strong>Last Updated:</strong> ${new Date(
            goal.updatedAt
          ).toLocaleString()}</p>
        </div>
      `,
      nzWidth: 500,
      nzFooter: [
        {
          label: 'Edit',
          type: 'primary',
          onClick: () => {
            this.modalService.closeAll();
            this.editGoal(goal);
          },
        },
        {
          label: 'Close',
          onClick: () => {
            this.modalService.closeAll();
          },
        },
      ],
    });
  }

  // Quick update goal status
  updateGoalStatus(goal: Goal, statusValue: string): void {
    // Convert string to GoalStatus enum value
    const status = statusValue as GoalStatus;

    this.goalService
      .updateGoal(goal.id, { status })
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: () => {
          this.loadGoals();
          this.messageService.success(
            `Goal status updated to ${this.goalService.getStatusDisplay(
              status
            )}`
          );
        },
        error: (error) => {
          console.error('Failed to update goal status', error);
          this.messageService.error('Failed to update goal status');
        },
      });
  }

  // Apply filters
  applyFilters(): void {
    let filtered = [...this.goals];

    // Apply text search if any
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (goal) =>
          goal.title.toLowerCase().includes(term) ||
          (goal.description && goal.description.toLowerCase().includes(term))
      );
    }

    // Apply status filter if any
    if (this.statusFilter.length > 0) {
      filtered = filtered.filter((goal) =>
        this.statusFilter.includes(goal.status)
      );
    }

    this.filteredGoals = filtered;
  }

  // Helper methods
  getStatusDisplay(status: string): string {
    return this.goalService.getStatusDisplay(status);
  }

  getStatusColor(status: string): string {
    return this.goalService.getStatusColor(status);
  }

  // Get progress status type
  getProgressStatus(
    progress: number
  ): 'success' | 'exception' | 'active' | 'normal' {
    if (progress < 25) return 'exception';
    if (progress < 70) return 'active';
    if (progress === 100) return 'success';
    return 'normal';
  }

  // Add helper methods for tag manipulation
  removeStatusFilter(status: string): void {
    this.statusFilter = this.statusFilter.filter((s) => s !== status);
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = [];
    this.filteredGoals = [...this.goals];
  }
}
