import { Component, forwardRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { UserService } from '../../../../../core/services/user.service';
import { User } from '../../../../../core/models';
import { AvatarComponent } from '../../../../../shared/components/avatar/avatar.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-assignee-filter-control',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzSelectModule, AvatarComponent],
  templateUrl: './assignee-filter-control.component.html',
  styleUrls: ['./assignee-filter-control.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AssigneeFilterControlComponent),
      multi: true,
    },
  ],
})
export class AssigneeFilterControlComponent
  implements OnInit, ControlValueAccessor
{
  users: User[] = [];
  selectedAssignees: string[] = [];
  formControl = new FormControl<string[]>([]);
  usersLoaded = false;

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    if (!this.usersLoaded) {
      this.loadUsers();
    }

    this.formControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => {
          // Check if arrays are the same
          if (!prev && !curr) return true;
          if (!prev || !curr) return false;
          if (prev.length !== curr.length) return false;
          return prev.every((val, idx) => val === curr[idx]);
        })
      )
      .subscribe((value) => {
        this.selectedAssignees = value || [];
        this.onChange(this.selectedAssignees);
      });
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users: User[]) => {
        this.users = users;
        this.usersLoaded = true;
      },
      error: (err) => {
        console.error('Error loading users:', err);
      },
    });
  }

  writeValue(value: string[]): void {
    this.selectedAssignees = value || [];
    this.formControl.setValue(this.selectedAssignees, { emitEvent: false });
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.formControl.disable();
    } else {
      this.formControl.enable();
    }
  }
}
