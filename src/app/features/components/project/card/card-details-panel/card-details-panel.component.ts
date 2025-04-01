import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  filter,
  tap,
  switchMap,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { User, Card, Column, PartialCard } from '../../../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { SvgIconComponent } from '../../../../../shared/components';
import { CardAssigneeComponent } from '../card-assignee/card-assignee.component';
import { CardPriorityComponent } from '../card-priority/card-priority.component';
import { CardLabelComponent } from '../card-label/card-label.component';
import { CardReporterComponent } from '../card-reporter/card-reporter.component';
import * as fromStore from '../../../../../core/store';
import { Store, select } from '@ngrx/store';
import { IssueService } from '../../../../services/issue.service';

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
    CardReporterComponent,
  ],
  templateUrl: './card-details-panel.component.html',
  styleUrls: ['./card-details-panel.component.scss'],
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
  isSubmitting = false;
  private lastCardId: string | null = null;
  private dataRefreshRequested = false;

  constructor(
    private store: Store<fromStore.AppState>,
    private issueService: IssueService
  ) {
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
    const selectedColumn = this.columns?.find(
      (c) => c.id === this.columnControl.value
    );
    return selectedColumn?.bgButton || '#ccc';
  }

  getColumnDropdownColor(): string {
    const selectedColumn = this.columns?.find(
      (c) => c.id === this.columnControl.value
    );
    return selectedColumn?.color || '#000';
  }

  onUpdateCard(partial: PartialCard): void {
    console.log('Updating card with partial data:', partial);
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    // Only update the store - we'll let the backend update happen through debounced controls
    this.store.dispatch(fromStore.updateCard({ partial }));
    this.isSubmitting = false;
  }

  onStoryPointsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const storyPoints = parseInt(target.value, 10) || 0;

    const partial: PartialCard = {
      id: this.card?.id || '',
      storyPoints: storyPoints,
    };

    this.onUpdateCard(partial);
  }

  onStartDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const startDate = target.value;

    const partial: PartialCard = {
      id: this.card?.id || '',
      startDate: startDate,
    };

    this.onUpdateCard(partial);
  }

  onDueDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const dueDate = target.value;

    const partial: PartialCard = {
      id: this.card?.id || '',
      dueDate: dueDate,
    };

    this.onUpdateCard(partial);
  }

  // Helper method to format date for input field
  formatDateForInput(dateStr?: string): string {
    if (!dateStr) return '';

    // If it's already in YYYY-MM-DD format, return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';

      // Format as YYYY-MM-DD for input type="date"
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  }

  private getBackendIssueId(cardId: string): string | null {
    // Extract backend issue ID from card ID if possible
    // This depends on how your application maps between card IDs and backend issue IDs
    // For now, just returning the cardId, but this might need to be adjusted
    return cardId;
  }

  private updateIssueInBackend(
    issueId: string,
    partialCard: PartialCard
  ): void {
    // Map from PartialCard to the format expected by the backend
    const updateData: any = {};

    if (partialCard.title !== undefined) {
      updateData.title = partialCard.title;
    }

    if (partialCard.description !== undefined) {
      updateData.description = partialCard.description;
    }

    if (partialCard.priority !== undefined) {
      updateData.priority = partialCard.priority;
    }

    if (partialCard.assigneeId !== undefined) {
      updateData.assignee = { id: partialCard.assigneeId };
    }

    if (partialCard.reporterId !== undefined) {
      updateData.reporter = { id: partialCard.reporterId };
    }

    if (partialCard.labels !== undefined) {
      updateData.labels = partialCard.labels;
    }

    if (partialCard.storyPoints !== undefined) {
      updateData.storyPoints = partialCard.storyPoints;
    }

    if (partialCard.startDate !== undefined) {
      updateData.startDate = partialCard.startDate;
    }

    if (partialCard.dueDate !== undefined) {
      updateData.dueDate = partialCard.dueDate;
    }

    if (partialCard.columnId !== undefined) {
      // Map columnId to appropriate status if needed
      const column = this.columns?.find((c) => c.id === partialCard.columnId);
      if (column) {
        updateData.status = this.mapColumnToStatus(column.name);
      }
    }

    console.log('Updating backend issue with data:', updateData);

    this.issueService
      .updateIssue(issueId, updateData)
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: (updatedIssue) => {
          console.log('Backend issue updated successfully:', updatedIssue);
        },
        error: (error) => {
          console.error('Error updating backend issue:', error);
        },
      });
  }

  private mapColumnToStatus(columnName: string): string {
    // Map column names to status values
    const statusMap: { [key: string]: string } = {
      'To Do': 'To Do',
      'In Progress': 'In Progress',
      Review: 'Review',
      Done: 'Done',
    };

    return statusMap[columnName] || 'To Do';
  }

  private subscribeEvents(): void {
    this.columns$
      .pipe(
        filter((columns) => !!columns),
        takeUntilDestroyed(this),
        tap((columns) => (this.columns = columns))
      )
      .subscribe();

    this.selectedCard$
      .pipe(
        filter((card) => !!card),
        takeUntilDestroyed(this),
        tap((card) => {
          this.card = card;
          this.columnControl.patchValue(card?.columnId, { emitEvent: false });

          this.assignee$ = this.store.pipe(
            select(fromStore.selectUserById(this.card?.assigneeId))
          );
          this.reporter$ = this.store.pipe(
            select(fromStore.selectUserById(this.card?.reporterId))
          );

          // Only fetch data from backend if it's a new card
          if (
            card &&
            card.id &&
            this.lastCardId !== card.id &&
            !this.dataRefreshRequested
          ) {
            this.lastCardId = card.id;
            this.dataRefreshRequested = true;

            // Use setTimeout to prevent immediate refresh
            setTimeout(() => {
              this.refreshCardDataFromBackend(card.id);
              this.dataRefreshRequested = false;
            }, 500);
          }
        })
      )
      .subscribe();
  }

  private refreshCardDataFromBackend(cardId: string): void {
    const issueId = this.getBackendIssueId(cardId);
    if (!issueId) return;

    this.issueService
      .getIssueById(issueId)
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: (issue) => {
          console.log('Fetched latest issue data from backend:', issue);
          // Update local card data with the latest from the backend
          // This might require dispatching an action to the store
          const updatedCard: PartialCard = {
            id: cardId,
            // Map fields from issue to card format
            title: issue.title,
            description: issue.description,
            priority: issue.priority,
            assigneeId: issue.assignee?.id,
            reporterId: issue.reporter?.id,
            labels: issue.labels,
            storyPoints: issue.storyPoints,
            startDate: issue.startDate
              ? this.formatDateForBackend(issue.startDate)
              : undefined,
            dueDate: issue.dueDate
              ? this.formatDateForBackend(issue.dueDate)
              : undefined,
          };

          this.store.dispatch(fromStore.updateCard({ partial: updatedCard }));
        },
        error: (error) => {
          console.error('Error fetching latest issue data:', error);
        },
      });
  }

  private formatDateForBackend(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private listenControls(): void {
    this.columnControl.valueChanges
      .pipe(
        filter((value) => !!value),
        debounceTime(500), // Add debounce time to prevent multiple rapid requests
        distinctUntilChanged(), // Only trigger if the value actually changed
        takeUntilDestroyed(this),
        tap((value) => {
          const partial: PartialCard = {
            id: this.card?.id || '',
            columnId: value,
          };
          this.onUpdateCard(partial);

          // Update backend separately with debounce
          if (this.card?.id) {
            const issueId = this.getBackendIssueId(this.card.id);
            if (issueId) {
              this.updateIssueInBackend(issueId, partial);
            }
          }
        })
      )
      .subscribe();
  }
}
