import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { BehaviorSubject, Observable, of, Subscription, throwError } from 'rxjs';
import { delay, finalize, map, catchError } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../../core/models';
import { UserRole } from '../../../core/models';
import { UserService } from '../../../core/services/user.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzButtonModule,
    NzPopconfirmModule,
    FormsModule,
    NzInputModule,
    NzFormModule,
    NzSelectModule,
    ReactiveFormsModule,
    NzModalModule,
    NzAvatarModule,
    NzToolTipModule,
    NzIconModule
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit, OnDestroy {

  users: User[] = [];
  displayUsers: User[] = [];
  isLoading = false;
  searchValue = '';

  // Modal properties
  isModalVisible = false;
  isEditing = false;
  currentUser: User | null = null;
  accountForm: FormGroup;
  submitting = false;
  modalTitle = '';

  private subscriptions = new Subscription();

  userRoles = Object.values(UserRole);



  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadUsers(): void {
    this.isLoading = true;
    // Mock API call
    this.subscriptions.add(this.userService.getUsers().pipe(
      finalize(() => this.isLoading = false),
      catchError(error => {
        console.error('Error loading users:', error);
        this.message.error('Failed to load users.');
        return throwError(error);
      })
    ).subscribe(users => {
      // Filter out ADMIN users
      // this.users = users.filter(user => user.role !== UserRole.ADMIN);
      this.displayUsers = [...users]; // Initialize display list
    }));
  }

  searchUsers(): void {
    if (!this.searchValue) {
      this.displayUsers = [...this.users];
      return;
    }
    const lowerCaseSearchValue = this.searchValue.toLowerCase();
    this.displayUsers = this.users.filter(user =>
      // Filter out ADMIN users and apply search filter
      user.role !== UserRole.ADMIN &&
      (user.firstName?.toLowerCase().includes(lowerCaseSearchValue) ||
      user.lastName?.toLowerCase().includes(lowerCaseSearchValue) ||
      user.email?.toLowerCase().includes(lowerCaseSearchValue) ||
      user.username?.toLowerCase().includes(lowerCaseSearchValue) ||
      user.role?.toLowerCase().includes(lowerCaseSearchValue))
    );
  }

  showAddModal(): void {
    this.isEditing = false;
    this.currentUser = null;
    this.accountForm.reset();
    this.modalTitle = 'Add Account';
    this.isModalVisible = true;

    // Add validators for password fields only when creating
    this.accountForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.accountForm.get('confirmPassword')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.accountForm.updateValueAndValidity();

  }



  constructor(private notification: NzNotificationService, private message: NzMessageService, private modalService: NzModalService, private fb: FormBuilder, private userService: UserService) {
    this.accountForm = this.fb.group({
    //  firstName: ['', Validators.required],
    //  lastName: ['', Validators.required],
     fullName: ['', Validators.required],
     age: [null, [Validators.required, Validators.min(0)]],
     email: ['', [Validators.required, Validators.email]],
     username: ['', Validators.required],
     role: [UserRole.BASIC, Validators.required],
     // Password fields might be needed for create, but not edit usually
     password: [''], // Add password field
     confirmPassword: [''] // Add confirm password field
   });
 }

 showEditModal(user: User): void {
  console.log(user)
  this.isEditing = true;
  this.currentUser = user;
  this.modalTitle = 'Edit Account';
  this.accountForm.patchValue(user);
  this.accountForm.get('fullName')?.setValue(user.firstName)
  this.isModalVisible = true;

   // Remove validators for password fields when editing
  this.accountForm.get('password')?.clearValidators();
  this.accountForm.get('confirmPassword')?.clearValidators();
  this.accountForm.updateValueAndValidity();

}

  handleModalOk(): void {
    if (this.accountForm.valid) {
      this.submitting = true;
      const formData = {
        firstName: this.accountForm.value.fullName,
        lastName: this.accountForm.value.fullName,
        age: this.accountForm.value.age,
        email: this.accountForm.value.email,
        username: this.accountForm.value.username,
        password: this.accountForm.value.password,
        fullName: this.accountForm.value.fullName,
        role: this.accountForm.value.role
      }

       if (this.isEditing && this.currentUser) {
        const formData = {
          firstName: this.accountForm.value.fullName,
          lastName: this.accountForm.value.fullName,
          age: this.accountForm.value.age,
          email: this.accountForm.value.email,
          username: this.accountForm.value.username,
          password: this.accountForm.value.password,
          role: this.accountForm.value.role
        }
        console.log(formData)
        // Handle Edit
        this.subscriptions.add(this.userService.updateUserById(this.currentUser.id, formData).pipe(
          finalize(() => this.submitting = false),
          catchError(error => {
            console.error('Error updating user:', error);
          this.notification.error('Error', 'Failed to update account.')
            return throwError(error);
          })
        ).subscribe(updatedUser => {
          const index = this.users.findIndex(u => u.id === this.currentUser!.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
            this.displayUsers = [...this.users];
          }
          this.notification.success('Success', 'Account updated successfully.')
          this.isModalVisible = false;
          this.loadUsers();
        }));

      } else {
         // Handle Add
         this.subscriptions.add(this.userService.createUser(formData).pipe(
           finalize(() => this.submitting = false),
           catchError(error => {
             console.error('Error creating user:', error);
             this.notification.error('Error', 'Failed to create account.')
             return throwError(error);
           })
         ).subscribe(newUser => {
            this.users = [...this.users, newUser];
            this.displayUsers = [...this.users];
            this.notification.success('Success', 'Account created successfully')
            this.isModalVisible = false;
          this.loadUsers();

         }));
      }

    } else {
      Object.values(this.accountForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
       this.message.warning('Please fill in all required fields correctly.');
    }
  }

  handleModalCancel(): void {
    this.isModalVisible = false;
    this.accountForm.reset(); // Reset form on cancel
  }

  confirmDelete(user: User): void {
     this.modalService.confirm({
      nzTitle: 'Are you sure you want to delete this account?',
      nzContent: `Deleting user <b>${user.username}</b>. This action cannot be undone.`,
      nzOkText: 'Yes',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'No',
      nzOnOk: () => this.deleteUser(user.id),
      nzOnCancel: () => console.log('Cancel delete')
    });
  }

  deleteUser(userId: string): void {
    this.isLoading = true;
    // Mock API call
    this.subscriptions.add(this.userService.deleteUser(userId).pipe(
      finalize(() => this.isLoading = false),
      catchError(error => {
        console.error('Error deleting user:', error);
        this.notification.error('Error', 'Failed to delete account.')
        return throwError(error);
      })
    ).subscribe(() => {
      this.users = this.users.filter(user => user.id !== userId);
      this.displayUsers = [...this.users];
      this.loadUsers()
      this.notification.success('Success', 'Account deleted successfully')
    }));
  }
}
