import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models';
import {
  NzNotificationModule,
  NzNotificationService,
} from 'ng-zorro-antd/notification';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { catchError, finalize, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

interface WorkItem {
  id: string;
  title: string;
  type: 'task' | 'project';
  status: string;
  dueDate?: Date;
  projectName?: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzNotificationModule,
    NzModalModule,
    NzTabsModule,
  ],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  isEditing = false;
  formData: Partial<User> = {
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    age: 0,
  };
  isLoading = false;
  selectedTabIndex = 0;

  // Your Work section
  workItems: WorkItem[] = [];
  isLoadingWork = false;

  // Team section
  teamMembers: TeamMember[] = [];
  isLoadingTeam = false;

  // Computed properties for task statistics
  get totalTasks(): number {
    return this.workItems.length;
  }

  get inProgressTasks(): number {
    return this.workItems.filter((item) => item.status === 'In Progress')
      .length;
  }

  get todoTasks(): number {
    return this.workItems.filter((item) => item.status === 'To Do').length;
  }

  constructor(
    private userService: UserService,
    private notification: NzNotificationService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    // Ensure we're using the real API, not mock data
    this.userService.setUseMockApi(false);

    this.loadUserProfile();
    this.loadWorkItems();
    this.loadTeamMembers();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.userService
      .getCurrentUser()
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.notification.error(
            'Error',
            `Failed to load profile: ${
              error.status === 401
                ? 'Unauthorized. Please log in again.'
                : error.message || 'Unknown error'
            }`,
            { nzDuration: 5000 }
          );
          console.error('Error loading profile:', error);
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((user) => {
        if (user) {
          this.user = user;
          this.formData = { ...user };
        }
      });
  }

  loadWorkItems(): void {
    this.isLoadingWork = true;
    // TODO: Implement API call to get user's work items when backend provides endpoint
    // For now using mock data
    setTimeout(() => {
      this.workItems = [
        {
          id: '1',
          title: 'Implement user authentication',
          type: 'task',
          status: 'In Progress',
          dueDate: new Date('2024-03-30'),
          projectName: 'Jira Clone',
        },
        {
          id: '2',
          title: 'Design database schema',
          type: 'task',
          status: 'To Do',
          dueDate: new Date('2024-04-01'),
          projectName: 'Jira Clone',
        },
      ];
      this.isLoadingWork = false;
    }, 1000);
  }

  loadTeamMembers(): void {
    this.isLoadingTeam = true;
    // TODO: Implement API call to get team members when backend provides endpoint
    // For now using mock data
    setTimeout(() => {
      this.teamMembers = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Project Manager',
          avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=random',
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'Developer',
          avatar:
            'https://ui-avatars.com/api/?name=Jane+Smith&background=random',
        },
      ];
      this.isLoadingTeam = false;
    }, 1000);
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing === false) {
      // Reset form data if user cancels editing
      this.formData = { ...this.user };
    }
  }

  onSubmit(): void {
    if (!this.user) return;

    this.isLoading = true;
    this.userService
      .updateUser(this.formData)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.notification.error(
            'Error',
            `Failed to update profile: ${
              error.status === 401
                ? 'Unauthorized. Please log in again.'
                : error.message || 'Unknown error'
            }`,
            { nzDuration: 5000 }
          );
          console.error('Error updating profile:', error);
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((updatedUser) => {
        if (updatedUser) {
          this.user = updatedUser;
          this.isEditing = false;
          this.notification.success(
            'Success',
            'Profile updated successfully!',
            { nzDuration: 3000 }
          );
        }
      });
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const { name, value } = target;
    this.formData = {
      ...this.formData,
      [name]: name === 'age' ? Number(value) : value,
    };
  }

  openChangePasswordModal(): void {
    const modalRef = this.modal.create({
      nzTitle: 'Change Password',
      nzContent: `
        <div class="p-4">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" id="currentPassword" class="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" id="newPassword" class="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" id="confirmPassword" class="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
        </div>
      `,
      nzOkText: 'Change Password',
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        const currentPassword = (
          document.getElementById('currentPassword') as HTMLInputElement
        ).value;
        const newPassword = (
          document.getElementById('newPassword') as HTMLInputElement
        ).value;
        const confirmPassword = (
          document.getElementById('confirmPassword') as HTMLInputElement
        ).value;

        if (!currentPassword || !newPassword || !confirmPassword) {
          this.notification.error('Error', 'All fields are required', {
            nzDuration: 3000,
          });
          return false;
        }

        if (newPassword !== confirmPassword) {
          this.notification.error('Error', 'New passwords do not match', {
            nzDuration: 3000,
          });
          return false;
        }

        this.isLoading = true;
        this.userService
          .changePassword(currentPassword, newPassword)
          .pipe(
            catchError((error: HttpErrorResponse) => {
              this.notification.error(
                'Error',
                `Failed to change password: ${
                  error.status === 401
                    ? 'Unauthorized. Please log in again.'
                    : error.message || 'Unknown error'
                }`,
                { nzDuration: 5000 }
              );
              console.error('Error changing password:', error);
              return of(null);
            }),
            finalize(() => {
              this.isLoading = false;
            })
          )
          .subscribe((response) => {
            if (response) {
              this.notification.success(
                'Success',
                'Password changed successfully!',
                { nzDuration: 3000 }
              );
              this.modal.closeAll();
            }
          });

        return true;
      },
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }
}
