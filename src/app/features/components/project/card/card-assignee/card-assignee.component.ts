import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  filter,
  tap,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';
import { User } from '../../../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { NzSelectModule } from 'ng-zorro-antd/select';
import {
  AvatarComponent,
  SvgIconComponent,
} from '../../../../../shared/components';
import { CommonModule } from '@angular/common';

@Destroyable()
@Component({
  selector: 'app-card-assignee',
  standalone: true,
  imports: [
    NzSelectModule,
    ReactiveFormsModule,
    AvatarComponent,
    SvgIconComponent,
    CommonModule,
  ],
  templateUrl: './card-assignee.component.html',
})
export class CardAssigneeComponent implements OnInit, OnChanges {
  @Input() users: Array<User> | null = [];
  @Input() assignee!: User | null | undefined;
  @Input() cardId!: string;

  @Output() updateAssignee = new EventEmitter();

  assigneeControl: FormControl;
  loading = false;
  private lastAssigneeId: string | null = null;

  constructor() {
    this.assigneeControl = new FormControl(null);
  }

  ngOnInit(): void {
    this.assigneeControl.valueChanges
      .pipe(
        filter((value) => !!value),
        debounceTime(300),
        distinctUntilChanged((prev, curr) => {
          // If both are objects with id property, compare ids
          return prev?.id === curr?.id;
        }),
        takeUntilDestroyed(this),
        tap((assignee) => {
          if (this.lastAssigneeId === assignee.id) {
            return; // No change, don't emit
          }

          this.loading = true;
          console.log('Updating assignee to:', assignee);
          this.lastAssigneeId = assignee.id;

          this.updateAssignee.emit({
            id: this.cardId,
            assigneeId: assignee.id,
          });
          this.loading = false;
        })
      )
      .subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const assignee = changes['assignee'];

    if (
      assignee &&
      assignee.previousValue !== assignee.currentValue &&
      this.assignee
    ) {
      console.log('Assignee changed to:', this.assignee);
      this.lastAssigneeId = this.assignee.id;
      this.assigneeControl.patchValue(this.assignee, { emitEvent: false });
    }
  }

  unassign(event: Event): void {
    event.stopPropagation();
    this.loading = true;
    console.log('Unassigning user');

    this.lastAssigneeId = null;

    this.updateAssignee.emit({
      id: this.cardId,
      assigneeId: null,
    });

    this.assigneeControl.patchValue(null, { emitEvent: false });
    this.loading = false;
  }
}
