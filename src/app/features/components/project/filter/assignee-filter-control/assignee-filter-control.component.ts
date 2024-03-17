import { Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from '../../../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../../../../../shared/components';
import { select, Store } from '@ngrx/store';
import * as fromStore from '../../../../../core/store';

@Destroyable()
@Component({
  selector: 'app-assignee-filter-control',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './assignee-filter-control.component.html',
  styleUrls: ['./assignee-filter-control.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AssigneeFilterControlComponent),
    multi: true,
  }]
})
export class AssigneeFilterControlComponent implements ControlValueAccessor {
  users$!: Observable<Array<User>>;
  users: Array<User> = [];

  selectedAssignees: Array<string> = [];

  private onTouched!: Function;
  private onChanged!: Function;

  constructor(private store: Store<fromStore.AppState>) {
    this.users$ = this.store.pipe(select(fromStore.allUsers));
    this.users$.pipe(
      takeUntilDestroyed(this),
      tap(users => (this.users = users))
    ).subscribe();
  }
  
  writeValue(assignees: Array<string>): void {
    this.selectedAssignees = [...assignees];
  }

  registerOnChange(fn: any): void {
    this.onChanged = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onChangeAssignee(id: string): void {
    if (this.selectedAssignees.includes(id)) {
      this.selectedAssignees = this.selectedAssignees.filter(id => id !== id);
    } else {
      this.selectedAssignees = [...this.selectedAssignees, id];
    }

    this.onChanged(this.selectedAssignees);
  }
}
