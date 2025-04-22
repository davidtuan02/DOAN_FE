import { Component, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs/operators';
import { UserService } from '../../../../core/services/user.service';
import {
  ProjectMembersService,
  ProjectMember,
  AccessLevel,
  AddProjectMemberDto,
} from '../../../../core/services/project-members.service';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-project-members',
  templateUrl: './project-members.component.html',
  styleUrls: ['./project-members.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzFormModule,
    NzSelectModule,
    NzModalModule,
    NzTagModule,
    NzIconModule,
  ],
})
export class ProjectMembersComponent implements OnInit {
  @Input() projectId: string = '';

  members: ProjectMember[] = [];
  filteredMembers: ProjectMember[] = [];
  loading = false;
  searchValue = '';

  // For adding/editing members
  isModalVisible = false;
  memberForm: FormGroup;
  isEditing = false;
  currentMemberId: string = '';
  submitting = false;

  // For access level options
  accessLevels = Object.values(AccessLevel);

  // For user search
  users: any[] = [];
  usersLoading = false;

  constructor(
    private projectMembersService: ProjectMembersService,
    private userService: UserService,
    private fb: FormBuilder,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
    this.memberForm = this.fb.group({
      userId: ['', [Validators.required]],
      accessLevel: [AccessLevel.DEVELOPER, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadMembers();
    this.loadUsers();
  }

  loadMembers(): void {
    if (!this.projectId) return;

    this.loading = true;
    this.projectMembersService
      .getProjectMembers(this.projectId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (members) => {
          this.members = members;
          this.filteredMembers = [...members];
        },
        error: (error: any) => {
          this.message.error('Failed to load project members');
          console.error('Error loading members:', error);
        },
      });
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.userService
      .getAllUsers()
      .pipe(finalize(() => (this.usersLoading = false)))
      .subscribe({
        next: (users: any[]) => {
          this.users = users;
        },
        error: (error: any) => {
          console.error('Error loading users:', error);
        },
      });
  }

  searchMembers(): void {
    if (!this.searchValue.trim()) {
      this.filteredMembers = [...this.members];
      return;
    }

    const search = this.searchValue.toLowerCase();
    this.filteredMembers = this.members.filter(
      (member) =>
        member.userName.toLowerCase().includes(search) ||
        member.userEmail.toLowerCase().includes(search)
    );
  }

  showAddModal(): void {
    this.isEditing = false;
    this.memberForm.reset({ accessLevel: AccessLevel.DEVELOPER });
    this.isModalVisible = true;
  }

  showEditModal(member: ProjectMember): void {
    this.isEditing = true;
    this.currentMemberId = member.userId;
    this.memberForm.patchValue({
      userId: member.userId,
      accessLevel: member.accessLevel,
    });
    this.memberForm.get('userId')?.disable();
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.memberForm.reset();
    if (this.isEditing) {
      this.memberForm.get('userId')?.enable();
    }
  }

  confirmDelete(member: ProjectMember): void {
    this.modal.confirm({
      nzTitle: 'Are you sure you want to remove this member?',
      nzContent: `This will remove ${member.userName} from the project.`,
      nzOkText: 'Yes',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => this.removeMember(member.userId),
      nzCancelText: 'No',
    });
  }

  removeMember(userId: string): void {
    this.projectMembersService
      .removeProjectMember(this.projectId, userId)
      .subscribe({
        next: () => {
          this.message.success('Member removed successfully');
          this.loadMembers();
        },
        error: (error: any) => {
          this.message.error('Failed to remove member');
          console.error('Error removing member:', error);
        },
      });
  }

  submitForm(): void {
    if (this.memberForm.invalid) {
      Object.values(this.memberForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
      return;
    }

    this.submitting = true;

    if (this.isEditing) {
      this.updateMember();
    } else {
      this.addMember();
    }
  }

  addMember(): void {
    const memberData: AddProjectMemberDto = this.memberForm.value;

    this.projectMembersService
      .addMemberToProject(this.projectId, memberData)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.message.success('Member added successfully');
          this.closeModal();
          this.loadMembers();
        },
        error: (error: any) => {
          this.message.error('Failed to add member');
          console.error('Error adding member:', error);
        },
      });
  }

  updateMember(): void {
    const { accessLevel } = this.memberForm.value;

    this.projectMembersService
      .updateProjectMember(this.projectId, this.currentMemberId, {
        accessLevel,
      })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.message.success('Member updated successfully');
          this.closeModal();
          this.loadMembers();
        },
        error: (error: any) => {
          this.message.error('Failed to update member');
          console.error('Error updating member:', error);
        },
      });
  }

  // Helper methods for template
  getUserNameById(userId: string): string {
    const user = this.users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  getAccessLevelLabel(level: AccessLevel): string {
    switch (level) {
      case AccessLevel.OWNER:
        return 'Owner';
      case AccessLevel.MAINTAINER:
        return 'Maintainer';
      case AccessLevel.DEVELOPER:
        return 'Developer';
      case AccessLevel.REPORTER:
        return 'Reporter';
      default:
        return level;
    }
  }

  getAccessLevelColor(level: AccessLevel): string {
    switch (level) {
      case AccessLevel.OWNER:
        return 'red';
      case AccessLevel.MAINTAINER:
        return 'purple';
      case AccessLevel.DEVELOPER:
        return 'blue';
      case AccessLevel.REPORTER:
        return 'green';
      default:
        return 'default';
    }
  }
}
