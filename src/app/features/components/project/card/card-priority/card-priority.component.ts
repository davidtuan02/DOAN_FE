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
import { filter, tap } from 'rxjs/operators';
import { CardPriorities } from '../../../../../core/constants';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SvgIconComponent } from '../../../../../shared/components';

@Destroyable()
@Component({
  selector: 'app-card-priority',
  standalone: true,
  imports: [
    CommonModule,
    NzSelectModule,
    ReactiveFormsModule,
    SvgIconComponent,
  ],
  templateUrl: './card-priority.component.html',
})
export class CardPriorityComponent implements OnInit, OnChanges {
  @Input() cardId: string = '';
  @Input() priority: string = '';
  @Output() updatePriority = new EventEmitter();

  editMode = false;

  CardPriorities = CardPriorities;
  priorityControl: FormControl;

  constructor() {
    this.priorityControl = new FormControl(null);
  }

  ngOnInit(): void {
    this.priorityControl.valueChanges
      .pipe(
        filter((value) => !!value),
        takeUntilDestroyed(this),
        tap((value) => {
          this.updatePriority.emit({
            id: this.cardId,
            priority: value,
          });
        })
      )
      .subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const priority = changes['priority'];

    if (
      priority &&
      priority.previousValue !== priority.currentValue &&
      this.priority
    ) {
      this.priorityControl.patchValue(this.priority, { emitEvent: false });
    }
  }

  onEnableEditMode(): void {
    this.editMode = true;
  }
}
