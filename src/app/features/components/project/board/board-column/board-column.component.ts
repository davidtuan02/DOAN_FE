import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  EventEmitter,
  Output,
} from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { nanoid } from 'nanoid';
import { Card, Column, PartialCard } from '../../../../../core/models';
import { CommonModule } from '@angular/common';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { SvgIconComponent } from '../../../../../shared/components';
import { BoardCardComponent } from '../board-card/board-card.component';
import { CreateCardFormComponent } from '../../card/create-card-form/create-card-form.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Store, select } from '@ngrx/store';
import * as fromStore from '../../../../../core/store';
import { filter, take, tap, switchMap } from 'rxjs/operators';
import { Issue } from '../../../../../features/services/issue.service';
import { CardTypesEnum } from '../../../../../core/enums';

@Component({
  selector: 'app-board-column',
  standalone: true,
  imports: [
    CommonModule,
    NzPopoverModule,
    DragDropModule,
    SvgIconComponent,
    BoardCardComponent,
    CreateCardFormComponent,
  ],
  templateUrl: './board-column.component.html',
  styleUrls: ['./board-column.component.scss'],
})
export class BoardColumnComponent implements OnInit, OnChanges {
  @Input() column!: Column;
  @Output() cardUpdated = new EventEmitter<void>();

  cards$!: Observable<Array<Card>>;
  loadingCardIds$!: Observable<Array<string>>;
  private cardsSubject = new BehaviorSubject<Card[]>([]);

  contextMenuVisible: boolean = false;

  constructor(
    private store: Store<fromStore.AppState>,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadingCardIds$ = this.store.pipe(
      select(fromStore.selectLoadingCardIds)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.column && changes['column']) {
      this.cards$ = this.store.pipe(
        select(fromStore.selectCardsByColumnIdWithFilters(this.column.id)),
        tap(cards => {
          this.cardsSubject.next(cards);
        })
      );
    }
  }

  onCardDropped(event: CdkDragDrop<Array<any>>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      const partial: PartialCard = {
        id: event.item.data,
        columnId: event.container.id,
      };

      // Dispatch update action
      this.store.dispatch(fromStore.updateCard({ partial }));

      // Subscribe to the updated card to ensure changes are reflected
      this.store.pipe(
        select(fromStore.selectCardById(partial.id)),
        filter(card => card !== undefined),
        take(1)
      ).subscribe(card => {
        if (card) {
          // Update local state
          const currentCards = this.cardsSubject.value;
          const updatedCards = currentCards.map(c =>
            c.id === partial.id ? { ...c, columnId: event.container.id } : c
          );
          this.cardsSubject.next(updatedCards);

          // Emit event to notify parent component
          this.cardUpdated.emit();
        }
      });
    }
  }

  onCreateCard(issueData: Partial<Issue>): void {
    // Map Issue type to Card type
    const newCard: Card = {
      id: nanoid(),
      ordinalId: 0,
      title: issueData.title || '',
      type: this.mapIssueTypeToCardType(issueData.type),
      columnId: this.column.id,
      priority: issueData.priority || 'Medium',
      assigneeId: issueData.assignee?.id || '',
      reporterId: issueData.reporter?.id || '',
      labels: issueData.labels || [],
      description: issueData.description || '',
      startDate: new Date().toISOString(),
      dueDate: issueData.dueDate ? issueData.dueDate.toISOString() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.dispatch(fromStore.createCard({ card: newCard }));
  }

  createComponentModal(id: string): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { selectedIssue: id },
      queryParamsHandling: 'merge',
    });
  }

  onContextMenuClick(): void {
    this.contextMenuVisible = false;
  }

  private mapIssueTypeToCardType(type?: string): CardTypesEnum {
    switch (type) {
      case 'Bug':
        return CardTypesEnum.BUG;
      case 'Story':
        return CardTypesEnum.STORY;
      case 'Task':
      default:
        return CardTypesEnum.TASK;
    }
  }
}
