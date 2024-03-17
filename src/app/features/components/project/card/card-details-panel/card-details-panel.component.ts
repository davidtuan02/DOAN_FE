import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { User, Card, Column, PartialCard } from '../../../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { SvgIconComponent } from '../../../../../shared/components';
import { CardAssigneeComponent } from '../card-assignee/card-assignee.component';
import { CardPriorityComponent } from '../card-priority/card-priority.component';
import { CardLabelComponent } from '../card-label/card-label.component';
import { CardStartDateComponent } from '../card-start-date/card-start-date.component';
import { CardDueDateComponent } from '../card-due-date/card-due-date.component';
import { CardReporterComponent } from '../card-reporter/card-reporter.component';
import * as fromStore from '../../../../../core/store';
import { Store, select } from '@ngrx/store';

@Destroyable()
@Component({
  selector: 'app-card-details-panel',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    NzSelectModule, 
    NzCollapseModule,
    SvgIconComponent, 
    CardAssigneeComponent, 
    CardPriorityComponent,
    CardLabelComponent,
    CardStartDateComponent,
    CardDueDateComponent,
    CardReporterComponent
  ],
  templateUrl: './card-details-panel.component.html',
  styleUrls: ['./card-details-panel.component.scss']
})
export class CardDetailsPanelComponent implements OnInit {
  columns$!: Observable<Array<Column>>;
  selectedCard$!: Observable<Card | undefined | null>;
  users$!: Observable<Array<User>>;
  reporter$!: Observable<User | undefined | null>;
  assignee$!: Observable<User | undefined | null>;
  labels$!: Observable<Array<string>>;

  card!: Card | undefined | null;
  columns!: Array<Column>;

  columnControl: FormControl;

  constructor(private store: Store<fromStore.AppState>) {
    this.columnControl = new FormControl(null, Validators.required);
  }

  ngOnInit(): void {
    this.selectedCard$ = this.store.pipe(select(fromStore.selectSelectedCard));
    this.columns$ = this.store.pipe(select(fromStore.allColumns));
    this.users$ = this.store.pipe(select(fromStore.allUsers));
    this.labels$ = this.store.pipe(select(fromStore.allLabels));

    this.subscribeEvents();
    this.listenControls();
  }

  getColumnDropdownBackgroundColor(): string {
    const selectedColumn = this.columns?.find(c => c.id === this.columnControl.value);
    return selectedColumn?.bgButton || '#ccc';
  }

  getColumnDropdownColor(): string {
    const selectedColumn = this.columns?.find(c => c.id === this.columnControl.value);
    return selectedColumn?.color || '#000';
  }

  onUpdateCard(partial: PartialCard): void {
    this.store.dispatch(fromStore.updateCard({ partial }));
  }

  private subscribeEvents(): void {
    this.columns$.pipe(
      filter(columns => !!columns),
      takeUntilDestroyed(this),
      tap(columns => (this.columns = columns))
    ).subscribe();

    this.selectedCard$.pipe(
      filter(card => !!card),
      takeUntilDestroyed(this),
      tap(card => {
        this.card = card;
        this.columnControl.patchValue(card?.columnId, { emitEvent: false });

        this.assignee$ = this.store.pipe(select(fromStore.selectUserById(this.card?.assigneeId)));
        this.reporter$ = this.store.pipe(select(fromStore.selectUserById(this.card?.reporterId)));
      })
    ).subscribe();
  }

  private listenControls(): void {
    this.columnControl.valueChanges.pipe(
      filter(value => !!value),
      takeUntilDestroyed(this),
      tap(value => {
        const partial: PartialCard = {
          id: this.card?.id || '',
          columnId: value
        };
        this.store.dispatch(fromStore.updateCard({ partial }));
      })
    ).subscribe();
  }
}
