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
  selector: 'app-card-reporter',
  standalone: true,
  imports: [
    NzSelectModule,
    ReactiveFormsModule,
    AvatarComponent,
    SvgIconComponent,
    CommonModule,
  ],
  templateUrl: './card-reporter.component.html',
})
export class CardReporterComponent implements OnInit, OnChanges {
  @Input() users: Array<User> | null = [];
  @Input() reporter!: User | null | undefined;
  @Input() cardId!: string;

  @Output() updateReporter = new EventEmitter();

  reporterControl: FormControl;
  loading = false;
  private lastReporterId: string | null = null;

  constructor() {
    this.reporterControl = new FormControl(null);
  }

  ngOnInit(): void {
    this.reporterControl.valueChanges
      .pipe(
        filter((value) => !!value),
        debounceTime(300),
        distinctUntilChanged((prev, curr) => {
          // If both are objects with id property, compare ids
          return prev?.id === curr?.id;
        }),
        takeUntilDestroyed(this),
        tap((reporter) => {
          if (this.lastReporterId === reporter.id) {
            return; // No change, don't emit
          }

          this.loading = true;
          console.log('Updating reporter to:', reporter);
          this.lastReporterId = reporter.id;

          this.updateReporter.emit({
            id: this.cardId,
            reporterId: reporter.id,
          });
          this.loading = false;
        })
      )
      .subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const reporter = changes['reporter'];

    if (
      reporter &&
      reporter.previousValue !== reporter.currentValue &&
      this.reporter
    ) {
      console.log('Reporter changed to:', this.reporter);
      this.lastReporterId = this.reporter.id;
      this.reporterControl.patchValue(this.reporter, { emitEvent: false });
    }
  }

  unassign(event: Event): void {
    event.stopPropagation();
    this.loading = true;
    console.log('Unassigning reporter');

    this.lastReporterId = null;

    this.updateReporter.emit({
      id: this.cardId,
      reporterId: null,
    });

    this.reporterControl.patchValue(null, { emitEvent: false });
    this.loading = false;
  }
}
