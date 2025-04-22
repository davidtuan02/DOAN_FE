import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalRef, NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  Goal,
  GoalStatus,
  CreateGoalRequest,
  UpdateGoalRequest,
} from '../../../../../core/models/goal/goal.model';
import { GoalService } from '../../../../../core/services/goal.service';
import { UserService } from '../../../../../core/services/user.service';
import { takeUntilDestroyed } from '../../../../../shared/utils';
import { User } from '../../../../../core/models';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectService } from '../../../../../core/services/project.service';

@Component({
  selector: 'app-goal-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzSliderModule,
    NzButtonModule,
    NzModalModule,
  ],
  templateUrl: './goal-form.component.html',
  styleUrls: ['./goal-form.component.scss'],
})
export class GoalFormComponent implements OnInit {
  @Input() goal: Goal | null = null;
  @Input() projectId: string = '';
  @Input() isEdit: boolean = false;

  goalForm!: FormGroup;
  submitting = false;
  statusOptions = Object.values(GoalStatus);
  users: User[] = [];

  constructor(
    private fb: FormBuilder,
    private modalRef: NzModalRef,
    private goalService: GoalService,
    private userService: UserService,
    private projectService: ProjectService,
    private messageService: NzMessageService
  ) {
    // Get data passed from modal
    const modalData = this.modalRef.getConfig().nzData;
    if (modalData) {
      this.goal = modalData.goal || null;
      this.isEdit = modalData.isEdit || false;
      this.projectId = modalData.projectId || '';

      console.log('Modal data received:', modalData);
      console.log('ProjectId from modal:', this.projectId);
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();

    // If projectId is not available from modal data, try to get it from the selected project
    if (!this.projectId) {
      const currentProject = this.projectService.getSelectedProject();
      if (currentProject && currentProject.id) {
        this.projectId = currentProject.id;
        console.log('ProjectId from selected project:', this.projectId);
      } else {
        console.error('No project ID available for goal creation');
        this.messageService.error('No project selected. Cannot create goal.');
      }
    }
  }

  initForm(): void {
    this.goalForm = this.fb.group({
      title: [
        this.goal?.title || '',
        [Validators.required, Validators.maxLength(255)],
      ],
      description: [this.goal?.description || ''],
      status: [this.goal?.status || GoalStatus.NOT_STARTED],
      progress: [this.goal?.progress || 0],
      startDate: [this.goal?.startDate ? new Date(this.goal.startDate) : null],
      dueDate: [this.goal?.dueDate ? new Date(this.goal.dueDate) : null],
      ownerId: [this.goal?.ownerId || null],
    });
  }

  loadUsers(): void {
    this.userService
      .getUsers()
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: (users: User[]) => {
          this.users = users;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Failed to load users', error);
          this.messageService.error('Failed to load users');
        },
      });
  }

  submitForm(): void {
    if (this.goalForm.invalid) {
      Object.values(this.goalForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    if (!this.projectId) {
      this.messageService.error('No project selected. Cannot create goal.');
      return;
    }

    this.submitting = true;

    // Format dates for API
    const formData = { ...this.goalForm.value };

    if (formData.startDate) {
      formData.startDate = this.formatDateForApi(formData.startDate);
    }

    if (formData.dueDate) {
      formData.dueDate = this.formatDateForApi(formData.dueDate);
    }

    if (this.isEdit && this.goal) {
      // Update existing goal
      const updateRequest: UpdateGoalRequest = formData;
      this.goalService
        .updateGoal(this.goal.id, updateRequest)
        .pipe(takeUntilDestroyed(this))
        .subscribe({
          next: (updatedGoal) => {
            this.submitting = false;
            this.modalRef.close(updatedGoal);
          },
          error: (error: HttpErrorResponse) => {
            this.submitting = false;
            console.error('Failed to update goal', error);
            this.messageService.error('Failed to update goal');
          },
        });
    } else {
      // Create new goal
      const createRequest: CreateGoalRequest = {
        ...formData,
        projectId: this.projectId,
      };

      console.log('Creating goal with request:', createRequest);

      this.goalService
        .createGoal(createRequest)
        .pipe(takeUntilDestroyed(this))
        .subscribe({
          next: (newGoal) => {
            this.submitting = false;
            this.modalRef.close(newGoal);
          },
          error: (error: HttpErrorResponse) => {
            this.submitting = false;
            console.error('Failed to create goal', error);
            this.messageService.error('Failed to create goal');
          },
        });
    }
  }

  // Helper method to format Date for API
  private formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Format methods for display
  getStatusDisplay(status: string): string {
    return this.goalService.getStatusDisplay(status);
  }

  getUserFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }

  cancel(): void {
    this.modalRef.close();
  }
}
