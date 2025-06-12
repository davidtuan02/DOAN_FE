import { CommonModule } from '@angular/common';
import { Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzBadgeComponent } from 'ng-zorro-antd/badge';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { SvgIconComponent } from '../../../../../shared/components';

@Component({
  selector: 'app-type-filter-control',
  standalone: true,
  imports: [
    CommonModule,
    NzCheckboxModule,
    NzPopoverModule,
    NzBadgeComponent,
    SvgIconComponent,
  ],
  templateUrl: './type-filter-control.component.html',
  styleUrls: ['./type-filter-control.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TypeFilterControlComponent),
      multi: true,
    },
  ],
})
export class TypeFilterControlComponent implements ControlValueAccessor {
  cardTypes = [
    {
      label: 'Task',
      icon: 'blueCheck',
      value: 'Task'
    },
    {
      label: 'Bug',
      icon: 'bug',
      value: 'Bug'
    },
    {
      label: 'Story',
      icon: 'story',
      value: 'Story'
    },
    {
      label: 'Sub-task',
      icon: 'subtask',
      value: 'Sub-task'
    }
  ];

  contextMenuVisible = false;

  selectedTypes: Array<string> = [];

  private onTouched!: Function;
  private onChanged!: Function;

  registerOnChange(fn: any): void {
    this.onChanged = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  writeValue(selectedTypes: Array<string>): void {
    console.log('Type filter writeValue:', selectedTypes);
    this.selectedTypes = [...selectedTypes];
  }

  onChangeFilter(selected: boolean, type: string) {
    console.log('Type filter changed:', { selected, type });
    if (this.selectedTypes.includes(type)) {
      this.selectedTypes = this.selectedTypes.filter((l) => l !== type);
    } else {
      this.selectedTypes = [...this.selectedTypes, type];
    }
    console.log('Selected types:', this.selectedTypes);
    this.onChanged(this.selectedTypes);
  }
}
