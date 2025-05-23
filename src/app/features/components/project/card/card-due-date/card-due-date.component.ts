import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NzDatePickerComponent } from 'ng-zorro-antd/date-picker';
import { filter, tap } from 'rxjs/operators';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CommonModule } from '@angular/common';

@Destroyable()
@Component({
  selector: 'app-card-due-date',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzDatePickerComponent],
  templateUrl: './card-due-date.component.html',
})
export class CardDueDateComponent implements OnInit, OnChanges {
  @ViewChild('picker', { static: false }) datePicker!: NzDatePickerComponent;
  @Input() dueDate!: string;
  @Input() cardId!: string;

  @Output() updateDueDate = new EventEmitter();

  editMode = false;

  dueDateControl: FormControl;

  constructor() {
    this.dueDateControl = new FormControl(new Date());
  }

  ngOnInit(): void {
    this.dueDateControl.valueChanges.pipe(
      filter(value => !!value),
      takeUntilDestroyed(this),
      tap((startDate: Date) => {
          this.updateDueDate.emit({
            id: this.cardId,
            dueDate: startDate.toISOString()
          });
        }
      )
    ).subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const dueDate = changes['dueDate'];
    if (dueDate && dueDate.currentValue !== dueDate.previousValue && this.dueDate) {
      this.dueDateControl.patchValue(new Date(this.dueDate), { emitEvent: false });
    }
  }

  onEnableEditMode(): void {
    this.editMode = true;
    setTimeout(() => {
      this.datePicker.open();
    });
  }
}
