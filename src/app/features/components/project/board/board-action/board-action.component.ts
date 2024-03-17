import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs/operators';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { AssigneeFilterControlComponent } from '../../filter/assignee-filter-control/assignee-filter-control.component';
import { SvgIconComponent } from '../../../../../shared/components';
import { CommonModule } from '@angular/common';
import { NzOptionComponent, NzSelectModule } from 'ng-zorro-antd/select';
import { CardFilter } from '../../../../../core/models/card/card-filter';
import { LabelFilterControlComponent } from '../../filter/label-filter-control/label-filter-control.component';
import { TypeFilterControlComponent } from '../../filter/type-filter-control/type-filter-control.component';

@Destroyable()
@Component({
  selector: 'app-board-action',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    AssigneeFilterControlComponent, 
    LabelFilterControlComponent,
    TypeFilterControlComponent,
    SvgIconComponent, 
    NzSelectModule, 
    NzOptionComponent],
  templateUrl: './board-action.component.html',
  styleUrls: ['./board-action.component.scss']
})
export class BoardActionComponent implements OnInit {
  @Input() clearFiltersVisible!: boolean | null;
  @Output() updateCardFilters = new EventEmitter();

  filterFormGroup: FormGroup;
  groupByControl: FormControl;

  contextMenuVisible = false;

  constructor() {
    this.groupByControl = new FormControl('None');

    this.filterFormGroup = new FormGroup({
      assignees: new FormControl([]),
      labels: new FormControl([]),
      types: new FormControl([]),
    });
  }

  ngOnInit(): void {
    this.filterFormGroup.valueChanges.pipe(
      takeUntilDestroyed(this),
      tap(filters => this.updateFilters(filters))
    ).subscribe();
  }

  updateFilters(filters: CardFilter): void {
    this.updateCardFilters.emit(filters);
  }

  clearFilters(): void {
    this.filterFormGroup.reset({ assignees: [], labels: [], types: [] });
  }
}
