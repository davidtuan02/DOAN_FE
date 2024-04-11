import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { Card, User } from '../../../../../core/models';
import { CardPriorityEnum, CardTypesEnum } from '../../../../../core/enums';
import { CommonModule } from '@angular/common';
import { AvatarComponent, SvgIconComponent } from '../../../../../shared/components';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Store, select } from '@ngrx/store';
import * as fromStore from '../../../../../core/store';

@Component({
  selector: 'app-board-card',
  standalone: true,
  imports: [CommonModule, NzPopoverModule, NzToolTipModule, AvatarComponent, SvgIconComponent, ],
  templateUrl: './board-card.component.html',
  styleUrls: ['./board-card.component.scss']
})
export class BoardCardComponent {
  @Input() card!: Card;
  @Input() loading: boolean = false;
  @Output() goToDetails = new EventEmitter<string>();

  assignee$!: Observable<User | null | undefined>;

  CardTypes = CardTypesEnum;
  CardPriority = CardPriorityEnum;

  contextMenuVisible: boolean = false;

  constructor(private store: Store<fromStore.AppState>) {
  }

  onCardClick(): void {
    this.goToDetails.emit(this.card.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const card = changes['card'];

    if (card && card.previousValue !== card.currentValue && this.card) {
      this.assignee$ = this.store.pipe(select(fromStore.selectUserById(this.card?.assigneeId)));
    }
  }

  onContextMenuClick(): void {
    this.contextMenuVisible = false;
  }
}
