import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { Card, User } from '../../../../../core/models';
import { CardPriorityEnum, CardTypesEnum } from '../../../../../core/enums';
import { CommonModule } from '@angular/common';
import { AvatarComponent, SvgIconComponent } from '../../../../../shared/components';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Store, select } from '@ngrx/store';
import * as fromStore from '../../../../../core/store';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { IssueService } from '../../../../services/issue.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-board-card',
  standalone: true,
  imports: [
    CommonModule,
    NzPopoverModule,
    NzToolTipModule,
    AvatarComponent,
    SvgIconComponent,
    NzModalModule,
    NzNotificationModule
  ],
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

  constructor(
    private store: Store<fromStore.AppState>,
    private notification: NzNotificationService,
    private modalService: NzModalService,
    private issueService: IssueService
  ) {
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

  copyLinkToClipboard() {
    if (!this.card) return;

    const issueId = this.card.ordinalId;
    const issueType = this.card.type.toLowerCase();
    const issueIdentifier = `${issueType}-${issueId}`;

    // Build the URL for the current issue
    const url = window.location.origin + `/board?selectedIssue=${this.card.id}`;

    // Copy to clipboard
    navigator.clipboard
      .writeText(url)
      .then(() => {
        this.notification.success(
          'Link Copied',
          `Link to issue ${issueIdentifier} has been copied to clipboard`,
          { nzDuration: 3000 }
        );
        this.onContextMenuClick(); // Close context menu after action
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        this.notification.error('Copy Failed', 'Could not copy link to clipboard.');
      });
  }

  deleteCard(): void {
    if (!this.card) return;

    this.modalService.confirm({
      nzTitle: 'Are you sure you want to delete this issue?',
      nzContent: 'This action cannot be undone.',
      nzOkText: 'Delete',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.issueService.deleteIssue(this.card.id).pipe(take(1)).subscribe({
          next: () => {
            this.notification.success('Issue Deleted', 'The issue has been successfully deleted.');
            // Optionally, dispatch an action to remove the card from the store
            this.store.dispatch(fromStore.deleteCardSuccess({ id: this.card.id }));
            this.onContextMenuClick(); // Close context menu after action
          },
          error: (err) => {
            console.error('Error deleting issue:', err);
            this.notification.error('Delete Failed', 'There was an error deleting the issue.');
          }
        });
      },
      nzCancelText: 'Cancel',
      nzOnCancel: () => {
        this.onContextMenuClick(); // Close context menu if cancelled
      }
    });
  }
}
