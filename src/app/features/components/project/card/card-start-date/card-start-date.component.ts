import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NzDatePickerComponent } from 'ng-zorro-antd/date-picker';
import { filter, tap } from 'rxjs/operators';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CommonModule } from '@angular/common';

@Destroyable()
@Component({
  selector: 'app-card-start-date',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzDatePickerComponent],
  templateUrl: './card-start-date.component.html',
})
export class CardStartDateComponent implements OnInit, OnChanges {
  @ViewChild('picker', { static: false }) datePicker!: NzDatePickerComponent;
  @Input() startDate!: string;
  @Input() cardId!: string;

  @Output() updateStartDate = new EventEmitter();

  editMode = false;

  startDateControl: FormControl;

  constructor() {
    this.startDateControl = new FormControl(new Date());
  }

  ngOnInit(): void {
    this.startDateControl.valueChanges.pipe(
      filter(value => !!value),
      takeUntilDestroyed(this),
      tap((startDate: Date) => {
          this.updateStartDate.emit({
            id: this.cardId,
            startDate: startDate.toISOString()
          });
        }
      )
    ).subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const startDate = changes['startDate'];
    if (startDate && startDate.currentValue !== startDate.previousValue && this.startDate) {
      this.startDateControl.patchValue(new Date(this.startDate), { emitEvent: false });
    }
  }

  onEnableEditMode(): void {
    this.editMode = true;
    setTimeout(() => {
      this.datePicker.open();
    });
  }
}
