import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter, tap } from 'rxjs/operators';
import { User } from '../../../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CommonModule } from '@angular/common';
import { AvatarComponent, SvgIconComponent } from '../../../../../shared/components';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Destroyable()
@Component({
  selector: 'app-card-assignee',
  standalone: true,
  imports: [
    CommonModule, 
    NzSelectModule,
    AvatarComponent, 
    SvgIconComponent, 
    ReactiveFormsModule
  ],
  templateUrl: './card-assignee.component.html',
})
export class CardAssigneeComponent implements OnInit {
  @Input() users: Array<User> | null = [];
  @Input() assignee!: User | null | undefined;
  @Input() cardId!: string;

  @Output() updateAssignee = new EventEmitter();

  assigneeControl: FormControl;

  editMode = false;

  constructor() {
    this.assigneeControl = new FormControl(null);
  }

  ngOnInit(): void {
    this.assigneeControl.valueChanges.pipe(
      filter(value => !!value),
      takeUntilDestroyed(this),
      tap(assignee => {
        this.updateAssignee.emit({
          id: this.cardId,
          assigneeId: assignee.id
        });
      })
    ).subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const assignee = changes['assignee'];

    if (assignee && assignee.previousValue !== assignee.currentValue && this.assignee) {
      this.assigneeControl.patchValue(this.assignee, { emitEvent: false });
    }
  }

  onEnableEditMode(): void {
    this.editMode = true;
  }
}
