import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AddMemberToTeamDto,
  TeamAccess,
  TeamMember,
  TeamService,
  UpdateMemberRoleDto,
} from '../../../../core/services/team.service';
import { UserService } from '../../../../core/services/user.service';
import { finalize, catchError } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { User, UserRole } from '../../../../core/models/user/user';
import {
  TeamPermissionsService,
  PermissionType,
} from '../../../../core/services/team-permissions.service';

@Component({
  selector: 'app-team-members',
  templateUrl: './team-members.component.html',
  styleUrls: ['./team-members.component.scss'],
  providers: [DatePipe],
})
export class TeamMembersComponent implements OnInit {
  @Input() teamId: string = '';

  members: TeamMember[] = [];
  filteredMembers: TeamMember[] = [];
  teamAccess: TeamAccess | null = null;
  loading = false;
  loadingUsers = false;
  error: string | null = null;

  // Add member form
  addMemberForm: FormGroup;
  showAddForm = false;
  submitting = false;
  users: User[] = [];

  // Edit role form
  editRoleForm: FormGroup;
  editingMember: TeamMember | null = null;
  updatingRole = false;

  // For removing a member
  isRemoveModalVisible = false;
  removingMember = false;
  memberToRemove: TeamMember | null = null;

  // For search and filter
  searchTerm = '';
  filterRole: 'all' | 'admin' | 'leader' | 'member' = 'all';
  searchTimeout: any;

  // Role descriptions for tooltips
  roleDescriptions = {
    admin: 'Can manage team members, but cannot manage projects or tasks.',
    leader: 'Can create, edit, delete projects and manage tasks.',
    member: 'Can create and edit their own tasks and participate in projects.',
  };

  constructor(
    private teamService: TeamService,
    private userService: UserService,
    private fb: FormBuilder,
    private message: NzMessageService,
    private permissionService: TeamPermissionsService
  ) {
    this.addMemberForm = this.fb.group({
      userId: ['', Validators.required],
      role: ['member', Validators.required],
    });

    this.editRoleForm = this.fb.group({
      role: ['member', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadMembers();
    this.checkTeamAccess();
  }

  loadMembers(): void {
    this.loading = true;
    this.error = null;

    this.teamService
      .getTeamMembers(this.teamId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (members) => {
          this.members = members;
          this.applyFilters();
          console.log('Team members loaded:', members.length);
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to load team members';
          console.error('Error loading team members:', err);
        },
      });
  }

  checkTeamAccess(): void {
    this.teamService.validateTeamAccess(this.teamId).subscribe({
      next: (access) => {
        this.teamAccess = access;
      },
      error: (err) => {
        console.error('Failed to validate team access', err);
      },
    });
  }

  toggleAddMemberForm(): void {
    this.showAddForm = !this.showAddForm;

    // Reset the form when toggling
    if (this.showAddForm) {
      this.addMemberForm.reset({ role: 'member' });

      // Load users only when opening the form and if users list is empty
      if (this.users.length === 0) {
        this.loadUsers();
      }
    }
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.error = null;

    this.userService
      .getAllUsers()
      .pipe(
        finalize(() => (this.loadingUsers = false)),
        catchError((err) => {
          console.error('Failed to load users via getAllUsers:', err);

          // Fallback to using the team service to get available users
          console.log('Falling back to getAvailableUsersForTeam method');
          return this.teamService.getAvailableUsersForTeam(this.teamId);
        })
      )
      .subscribe({
        next: (users: User[]) => {
          console.log('All users loaded:', users.length);

          // Filter out users already in the team
          const memberIds = this.members.map((m) => m.user.id);
          this.users = users.filter((user) => !memberIds.includes(user.id));

          // Sort by user's name
          this.users.sort((a, b) =>
            `${a.firstName} ${a.lastName}`.localeCompare(
              `${b.firstName} ${b.lastName}`
            )
          );

          console.log('Available users for team:', this.users.length);
        },
        error: (err: any) => {
          console.error('Error loading users:', err);
          this.message.error('Failed to load available users');
          this.error = 'Failed to load users. Please try again.';
        },
      });
  }

  onAddMember(): void {
    if (this.addMemberForm.invalid) {
      // Mark fields as touched to show validation errors
      Object.keys(this.addMemberForm.controls).forEach((key) => {
        const control = this.addMemberForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    this.error = null;
    const formData = this.addMemberForm.value;

    console.log('Adding member:', formData);

    this.teamService
      .addMemberToTeam(this.teamId, formData)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (newMember) => {
          console.log('Member added successfully:', newMember);
          this.members.push(newMember);
          this.applyFilters();
          this.showAddForm = false;
          this.addMemberForm.reset({ role: 'member' });

          // Update the users list to remove the added user
          this.users = this.users.filter(
            (user) => user.id !== newMember.user.id
          );

          this.message.success('Member added successfully');
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to add member';
          console.error('Error adding member:', err);
          this.message.error(this.error || 'Failed to add member');
        },
      });
  }

  startEditRole(member: TeamMember): void {
    this.editingMember = member;
    this.editRoleForm.setValue({ role: member.role });
  }

  cancelEditRole(): void {
    this.editingMember = null;
  }

  updateRole(): void {
    if (!this.editingMember) return;

    this.updatingRole = true;
    this.error = null;
    const roleData = this.editRoleForm.value;
    const userId = this.editingMember.user.id;
    const userName = `${this.editingMember.user.firstName} ${this.editingMember.user.lastName}`;

    console.log('Updating role for', userName, 'to', roleData.role);

    this.teamService
      .updateMemberRole(this.teamId, userId, roleData)
      .pipe(finalize(() => (this.updatingRole = false)))
      .subscribe({
        next: (updatedMember) => {
          console.log('Member role updated successfully:', updatedMember);

          // Update the member in the list
          const index = this.members.findIndex(
            (m) => m.id === updatedMember.id
          );
          if (index !== -1) {
            this.members[index] = updatedMember;
            this.applyFilters();
          }

          this.editingMember = null;
          this.message.success(
            `${userName}'s role updated to ${roleData.role}`
          );
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to update member role';
          console.error('Error updating member role:', err);
          this.message.error(this.error || 'Failed to update member role');
        },
      });
  }

  confirmRemoveMember(member: TeamMember): void {
    this.memberToRemove = member;
    this.isRemoveModalVisible = true;
  }

  handleRemoveCancel(): void {
    this.isRemoveModalVisible = false;
    this.memberToRemove = null;
  }

  handleRemoveOk(): void {
    if (!this.memberToRemove) return;

    this.removingMember = true;
    this.error = null;
    const userId = this.memberToRemove.user.id;
    const userName = `${this.memberToRemove.user.firstName} ${this.memberToRemove.user.lastName}`;

    console.log('Removing member:', userName);

    this.teamService
      .removeMemberFromTeam(this.teamId, userId)
      .pipe(
        finalize(() => {
          this.removingMember = false;
          this.isRemoveModalVisible = false;
          this.memberToRemove = null;
        })
      )
      .subscribe({
        next: () => {
          console.log('Member removed successfully:', userName);

          // Remove the member from the list
          this.members = this.members.filter((m) => m.user.id !== userId);
          this.applyFilters();

          // Don't add the user back to the available users list here
          // Instead, reload the available users to ensure data consistency
          this.loadUsers();

          this.message.success(`${userName} has been removed from the team`);
        },
        error: (err) => {
          this.error =
            err.error?.message || `Failed to remove ${userName} from the team`;
          console.error('Error removing member:', err);
          this.message.error(
            this.error || `Failed to remove ${userName} from the team`
          );
        },
      });
  }

  removeMember(userId: string): void {
    this.teamService.removeMemberFromTeam(this.teamId, userId).subscribe({
      next: () => {
        this.members = this.members.filter((m) => m.user.id !== userId);
        this.applyFilters();
        this.message.success('Member removed successfully');
      },
      error: (err) => {
        console.error('Failed to remove member', err);
        this.message.error('Failed to remove member');
      },
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;

    // Debounce search for better performance
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }

  onFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterRole = select.value as 'all' | 'admin' | 'leader' | 'member';
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterRole = 'all';
    this.applyFilters();
  }

  applyFilters(): void {
    if (!this.members) {
      this.filteredMembers = [];
      return;
    }

    let filtered = [...this.members];

    // Apply search filter
    if (this.searchTerm?.trim()) {
      const searchLower = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter((member) => {
        const fullName =
          `${member.user.firstName} ${member.user.lastName}`.toLowerCase();
        const email = member.user.email.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Apply role filter
    if (this.filterRole && this.filterRole !== 'all') {
      filtered = filtered.filter((member) => member.role === this.filterRole);
    }

    // Sort members by name
    filtered.sort((a, b) => {
      const nameA = `${a.user.firstName} ${a.user.lastName}`.toLowerCase();
      const nameB = `${b.user.firstName} ${b.user.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    this.filteredMembers = filtered;
    console.log(
      `Filtered members: ${filtered.length} of ${this.members.length}`
    );
  }

  canManageTeam(): boolean {
    if (!this.teamAccess) return false;

    // Check if user is team admin or leader
    if (this.teamAccess.role === 'admin' || this.teamAccess.role === 'leader')
      return true;

    // We can't directly check for global admin role here, so we'll allow it
    // and the actual permission will be checked by the permission service
    return false;
  }

  // Add method to get role description for tooltips
  getRoleDescription(role: string): string {
    return (
      this.roleDescriptions[role as keyof typeof this.roleDescriptions] || ''
    );
  }

  // Check if the current user can promote members to leader
  canPromoteToLeader(): boolean {
    if (!this.teamAccess) return false;

    // Only team admins can promote to leader
    return this.teamAccess.role === 'admin';
  }
}
