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
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TeamService } from '../../../../core/services/team.service';
import { ProjectService } from '../../../../core/services/project.service';

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
    private teamService: TeamService,
    private projectService: ProjectService,
    private notification: NzNotificationService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    // Ensure we're using the real API, not mock data
    this.userService.setUseMockApi(false);

    this.loadUserProfile();
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

          // After user data is loaded, fetch related data
          this.loadWorkItems();
          this.loadTeamMembers();
        }
      });
  }

  loadWorkItems(): void {
    if (!this.user || !this.user.id) {
      return;
    }

    this.isLoadingWork = true;

    // Get tasks assigned to the current user
    this.projectService
      .getCurrentUserProjects()
      .pipe(
        catchError((error) => {
          this.notification.error(
            'Error',
            `Failed to load work items: ${error.message || 'Unknown error'}`,
            { nzDuration: 3000 }
          );
          console.error('Error loading work items:', error);
          return of([]);
        }),
        finalize(() => {
          this.isLoadingWork = false;
        })
      )
      .subscribe((projects) => {
        // Transform projects to work items
        this.workItems = projects.map((project) => ({
          id: project.id || '',
          title: project.name,
          type: 'project',
          status: project.status || 'Active',
          projectName: project.key,
        }));

        // You may also want to get tasks assigned to the user
        // For tasks, you would need an API endpoint that returns tasks assigned to the user
        // This could be implemented in a future iteration
      });
  }

  loadTeamMembers(): void {
    if (!this.user || !this.user.id) {
      return;
    }

    this.isLoadingTeam = true;

    // Get teams the user belongs to
    this.teamService
      .getMyTeams()
      .pipe(
        catchError((error) => {
          this.notification.error(
            'Error',
            `Failed to load team data: ${error.message || 'Unknown error'}`,
            { nzDuration: 3000 }
          );
          console.error('Error loading team data:', error);
          return of([]);
        }),
        finalize(() => {
          this.isLoadingTeam = false;
        })
      )
      .subscribe((teams: any[]) => {
        // Get all team members from all teams
        if (teams && teams.length > 0) {
          const uniqueMembers = new Map<string, TeamMember>();

          teams.forEach((team: any) => {
            if (team.usersIncludes && Array.isArray(team.usersIncludes)) {
              team.usersIncludes.forEach((userTeam: any) => {
                if (userTeam.user) {
                  const user = userTeam.user;
                  uniqueMembers.set(user.id, {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: userTeam.role || 'Member',
                    avatar: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`,
                  });
                }
              });
            }
          });

          this.teamMembers = Array.from(uniqueMembers.values());
        }
      });
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
      nzOkType: 'primary',
      nzOnOk: () => {
        const currentPassword = (
          document.getElementById('currentPassword') as HTMLInputElement
        )?.value;
        const newPassword = (
          document.getElementById('newPassword') as HTMLInputElement
        )?.value;
        const confirmPassword = (
          document.getElementById('confirmPassword') as HTMLInputElement
        )?.value;

        if (!currentPassword || !newPassword || !confirmPassword) {
          this.notification.error('Error', 'All fields are required', {
            nzDuration: 3000,
          });
          return false;
        }

        if (newPassword !== confirmPassword) {
          this.notification.error('Error', 'Passwords do not match', {
            nzDuration: 3000,
          });
          return false;
        }

        this.userService
          .changePassword(currentPassword, newPassword)
          .pipe(
            catchError((error) => {
              this.notification.error(
                'Error',
                `Failed to change password: ${
                  error.message || 'Unknown error'
                }`,
                { nzDuration: 5000 }
              );
              console.error('Error changing password:', error);
              return of(null);
            })
          )
          .subscribe((result) => {
            if (result !== null) {
              this.notification.success(
                'Success',
                'Password changed successfully!',
                { nzDuration: 3000 }
              );
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
