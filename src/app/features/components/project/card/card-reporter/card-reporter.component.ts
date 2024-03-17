import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter, tap } from 'rxjs/operators';
import { User } from '../../../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AvatarComponent, SvgIconComponent } from '../../../../../shared/components';

@Destroyable()
@Component({
  selector: 'app-card-reporter',
  standalone: true,
  imports: [NzSelectModule, ReactiveFormsModule, AvatarComponent, SvgIconComponent],
  templateUrl: './card-reporter.component.html',
})
export class CardReporterComponent implements OnInit, OnChanges {
  @Input() users: Array<User> | null = [];
  @Input() reporter!: User | null | undefined;
  @Input() cardId!: string;

  @Output() updateReporter = new EventEmitter();

  reporterControl: FormControl;

  constructor() {
    this.reporterControl = new FormControl(null);
  }

  ngOnInit(): void {
    this.reporterControl.valueChanges.pipe(
      filter(value => !!value),
      takeUntilDestroyed(this),
      tap(reporter => {
        this.updateReporter.emit({
          id: this.cardId,
          reporterId: reporter.id
        });
      })
    ).subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const reporter = changes['reporter'];

    if (reporter && reporter.previousValue !== reporter.currentValue && this.reporter) {
      this.reporterControl.patchValue(this.reporter, { emitEvent: false });
    }
  }
}
