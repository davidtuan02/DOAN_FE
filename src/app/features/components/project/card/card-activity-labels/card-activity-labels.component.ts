import { Component } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivityViewMode } from '../../../../../core/constants';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-activity-labels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-activity-labels.component.html',
  styleUrls: ['./card-activity-labels.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: CardActivityLabelsComponent,
    multi: true
  }],
})
export class CardActivityLabelsComponent implements ControlValueAccessor {
  mode: ActivityViewMode = 'comments';

  private onTouched!: Function;
  private onChanged!: Function;

  registerOnChange(fn: any): void {
    this.onChanged = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  writeValue(mode: ActivityViewMode): void {
    this.mode = mode;
  }

  onChangeMode(mode: ActivityViewMode): void {
    this.mode = mode;
    this.onChanged(mode);
  }

}
