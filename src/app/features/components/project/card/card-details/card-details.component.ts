import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { Observable } from 'rxjs';
import { Card, Column } from '../../../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CardTypesEnum } from '../../../../../core/enums';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from '../../../../../shared/components';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { CardDescriptionsPanelComponent } from '../card-descriptions-panel/card-descriptions-panel.component';
import { CardDetailsPanelComponent } from '../card-details-panel/card-details-panel.component';
import { NzDividerComponent } from 'ng-zorro-antd/divider';
import { CardDetailsLoaderComponent } from '../card-details-loader/card-details-loader.component';
import * as fromStore from '../../../../../core/store';
import { Store, select } from '@ngrx/store';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Inject, Optional } from '@angular/core';
import { ProjectService } from '../../../../../core/services/project.service';
import { filter, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalService } from 'ng-zorro-antd/modal';
import { IssueService } from '../../../../../features/services/issue.service';
import { FormsModule } from '@angular/forms';
import { NzSelectModule, NzFilterOptionType } from 'ng-zorro-antd/select';
import { PermissionService } from '../../../../../core/services/permission.service';

interface ModalData {
  onClose?: () => void;
}

@Destroyable()
@Component({
  selector: 'app-card-details',
  standalone: true,
  imports: [
    CommonModule,
    NzPopoverModule,
    SvgIconComponent,
    CardDescriptionsPanelComponent,
    CardDetailsPanelComponent,
    NzDividerComponent,
    CardDetailsLoaderComponent,
    FormsModule,
    NzSelectModule,
  ],
  templateUrl: './card-details.component.html',
  styleUrls: ['./card-details.component.scss'],
})
export class CardDetailsComponent implements OnInit {
  @ViewChild('parentIssueModalTpl') parentIssueModalTpl!: TemplateRef<any>;

  columns$!: Observable<Array<Column>>;
  selectedCard$!: Observable<Card | undefined | null>;

  projectName: string = 'Project';
  CardTypes = CardTypesEnum;

  contextMenuVisible: boolean = false;
  copyLinkSuccess = false;

  // For parent selection
  allCards: Card[] = [];
  searchValue: string = '';
  isAddingParent: boolean = false;
  selectedParentId: string = '';

  canDeleteCard = false;

  constructor(
    private store: Store<fromStore.AppState>,
    private projectService: ProjectService,
    private router: Router,
    @Optional() @Inject(NZ_MODAL_DATA) private modalData: ModalData,
    private notification: NzNotificationService,
    private modalService: NzModalService,
    private issueService: IssueService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.selectedCard$ = this.store.pipe(select(fromStore.selectSelectedCard));
    this.columns$ = this.store.pipe(select(fromStore.allColumns));

    // Lấy tên project từ ProjectService
    const selectedProject = this.projectService.getSelectedProject();
    if (selectedProject) {
      this.projectName = selectedProject.name;
    }

    // Theo dõi thay đổi card được chọn
    this.selectedCard$
      .pipe(
        filter((card) => !!card),
        takeUntilDestroyed(this),
        tap((card) => {
          console.log('Card details component - Card loaded:', card);
          if (card) {
            // Có thể thực hiện các thao tác bổ sung khi card đã được load
            // Ví dụ: tải comments hoặc các thông tin phụ thuộc khác
          }
        })
      )
      .subscribe();

    // Check admin permission
    this.permissionService.isAdmin().pipe(
      takeUntilDestroyed(this)
    ).subscribe(isAdmin => {
      console.log(isAdmin)
      this.canDeleteCard = isAdmin;
    });
  }

  // Get the type of the parent task
  getParentTaskType(card: Card): CardTypesEnum {
    if (!card.parentTaskId) return CardTypesEnum.TASK;

    // Try to get parent task type from store if available
    const parentTask = this.getParentTaskFromStore(card.parentTaskId);
    if (parentTask) {
      // Convert parent task type to CardTypesEnum
      switch (parentTask.type) {
        case 'TASK':
          return CardTypesEnum.TASK;
        case 'BUG':
          return CardTypesEnum.BUG;
        case 'STORY':
          return CardTypesEnum.STORY;
        case 'SUB_TASK':
          return CardTypesEnum.SUB_TASK;
        default:
          // Try to parse from string
          try {
            return parentTask.type as CardTypesEnum;
          } catch (e) {
            return CardTypesEnum.TASK;
          }
      }
    }

    // Default to TASK if no information is available
    return CardTypesEnum.TASK;
  }

  // Helper method to find parent task in store
  private getParentTaskFromStore(parentTaskId: string): Card | null {
    let parentTask: Card | null = null;

    // Get all cards from store
    this.store.pipe(select(fromStore.allCards), take(1)).subscribe((cards) => {
      parentTask = cards.find((c) => c.id === parentTaskId) || null;
    });

    return parentTask;
  }

  // Get the ID of the parent task for display
  getParentTaskId(card: Card): string {
    if (!card.parentTaskId) return '';

    // Return the first 8 chars of parent task ID
    return card.parentTaskId.slice(0, 8).toUpperCase();
  }

  // Open the parent issue when clicked in the breadcrumb
  openParentIssue(card: Card): void {
    if (!card.parentTaskId) return;

    // Close the current card
    this.onCloseModal();

    // Check current route to determine where to navigate
    const url = this.router.url;
    const currentProject = this.projectService.getSelectedProject();

    if (currentProject) {
      if (url.includes('/issues')) {
        // If we're on the issues page, stay there
        this.router.navigate(['/issues'], {
          queryParams: { selectedIssue: card.parentTaskId },
        });
      } else {
        // Otherwise go to the board with the parent issue
        this.router.navigate(['/board'], {
          queryParams: { issueId: card.parentTaskId },
        });
      }
    }
  }

  // Get a formatted issue ID for display
  getIssueId(card: Card): string {
    // Check if ordinalId is valid
    if (card.ordinalId && !isNaN(card.ordinalId)) {
      return card.ordinalId.toString();
    }

    // For subtasks, try to extract a meaningful ID
    if (card.type === CardTypesEnum.SUB_TASK && card.id) {
      const idParts = card.id.split('-');
      if (idParts.length > 1) {
        return idParts[idParts.length - 1];
      }

      // If no dash format, use the last 4-5 characters
      return card.id.slice(-5).toUpperCase();
    }

    // Fallback to using part of the card ID if ordinalId is not valid
    if (card.id) {
      // Use the last 4 characters of the ID to keep it short
      return card.id.slice(-4).toUpperCase();
    }

    // Ultimate fallback
    return 'ID';
  }

  onCloseModal(): void {
    if (this.modalData && this.modalData.onClose) {
      this.modalData.onClose();
    }
  }

  onContextMenuClick(): void {
    this.contextMenuVisible = false;
  }

  copyLinkToClipboard() {
    this.selectedCard$.pipe(take(1)).subscribe((card) => {
      if (!card) return;

      const issueId = this.getIssueId(card);
      const issueType = card.type.toLowerCase();
      const issueIdentifier = `${issueType}-${issueId}`;

      // Build the URL for the current issue
      const url = window.location.origin + `/board?selectedIssue=${card.id}`;

      // Copy to clipboard
      navigator.clipboard
        .writeText(url)
        .then(() => {
          this.copyLinkSuccess = true;
          this.notification.success(
            'Link Copied',
            `Link to issue ${issueIdentifier} has been copied to clipboard`,
            { nzDuration: 3000 }
          );
          setTimeout(() => {
            this.copyLinkSuccess = false;
          }, 3000);
        })
        .catch((err) => {
          console.error('Failed to copy link: ', err);
          this.notification.error(
            'Failed to Copy',
            'Could not copy link to clipboard',
            { nzDuration: 3000 }
          );
        });
    });
  }

  // Filter function for the select dropdown
  filterOption: NzFilterOptionType = (input: string, option): boolean => {
    if (!option.nzLabel) return false;
    return (
      option.nzLabel.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0
    );
  };

  // Add parent functionality
  addParent(): void {
    this.contextMenuVisible = false;

    this.selectedCard$.pipe(take(1)).subscribe((card) => {
      if (!card) return;

      // Fetch all cards to use as potential parents
      this.store
        .pipe(select(fromStore.allCards), take(1))
        .subscribe((cards) => {
          // Filter out the current card and any cards that already have this card as parent
          this.allCards = cards.filter(
            (c) =>
              c.id !== card.id &&
              c.parentTaskId !== card.id &&
              c.type !== CardTypesEnum.SUB_TASK
          );

          if (this.allCards.length === 0) {
            this.notification.warning(
              'No Available Parents',
              'There are no suitable issues that can be set as parent.'
            );
            return;
          }

          this.showAddParentModal(card);
        });
    });
  }

  showAddParentModal(card: Card): void {
    this.isAddingParent = true;
    this.selectedParentId = '';

    const modal = this.modalService.create({
      nzTitle: `Add Parent Issue for "${card.title}"`,
      nzContent: this.parentIssueModalTpl,
      nzOkText: 'Add Parent',
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        if (!this.selectedParentId) {
          this.notification.warning(
            'No Selection',
            'Please select a parent issue.'
          );
          return false;
        }
        this.updateParentTask(card.id, this.selectedParentId);
        return true;
      },
    });
  }

  updateParentTask(cardId: string, parentId: string): void {
    // Update the card in the store with the new parent
    const partial = {
      id: cardId,
      parentTaskId: parentId,
    };

    this.store.dispatch(fromStore.updateCard({ partial }));
    this.notification.success('Success', 'Parent issue has been added.');
  }

  // Clone functionality
  cloneCard(): void {
    this.contextMenuVisible = false;

    this.selectedCard$.pipe(take(1)).subscribe((card) => {
      if (!card) return;

      this.modalService.confirm({
        nzTitle: 'Clone Issue',
        nzContent: `Are you sure you want to clone "${card.title}"?`,
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOnOk: () => {
          // Create a new card based on the current one
          const clonedCard: Partial<Card> = {
            ...card,
            title: `${card.title} (Clone)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Remove properties that shouldn't be cloned
          delete (clonedCard as any).id;
          delete (clonedCard as any).ordinalId;

          this.store.dispatch(
            fromStore.createCard({ card: clonedCard as Card })
          );
          this.notification.success(
            'Success',
            'Issue has been cloned successfully.'
          );
        },
      });
    });
  }

  // Delete functionality
  deleteCard(): void {
    this.contextMenuVisible = false;

    this.selectedCard$.pipe(take(1)).subscribe((card) => {
      if (!card) return;

      this.modalService.confirm({
        nzTitle: 'Delete Issue',
        nzContent: `Are you sure you want to delete "${card.title}"? This action cannot be undone.`,
        nzOkText: 'Delete',
        nzOkDanger: true,
        nzCancelText: 'Cancel',
        nzOnOk: () => {
          this.issueService.deleteIssue(card.id).subscribe({
            next: () => {
              // Close the modal
              this.onCloseModal();

              // Remove the card from the store
              this.store.dispatch(fromStore.deleteCard({ id: card.id }));

              // Show success notification
              this.notification.success(
                'Success',
                'Issue has been deleted successfully.'
              );

              // Navigate back to board
              this.router.navigate(['/board']);
            },
            error: (err) => {
              console.error('Error deleting issue:', err);
              this.notification.error(
                'Error',
                'Failed to delete issue. Please try again.'
              );
            },
          });
        },
      });
    });
  }
}
