import { Component, OnInit } from '@angular/core';
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
  ],
  templateUrl: './card-details.component.html',
  styleUrls: ['./card-details.component.scss'],
})
export class CardDetailsComponent implements OnInit {
  columns$!: Observable<Array<Column>>;
  selectedCard$!: Observable<Card | undefined | null>;

  projectName: string = 'Project';
  CardTypes = CardTypesEnum;

  contextMenuVisible: boolean = false;

  constructor(
    private store: Store<fromStore.AppState>,
    private projectService: ProjectService,
    private router: Router,
    @Optional() @Inject(NZ_MODAL_DATA) private modalData: ModalData
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
  }

  // Get the type of the parent task
  getParentTaskType(card: Card): CardTypesEnum {
    if (!card.parentTaskId) return CardTypesEnum.TASK;

    // If there's a parent task ID but no type info, return default type
    return CardTypesEnum.TASK;
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

    // Navigate to the parent task - use the board URL with query params
    const currentProject = this.projectService.getSelectedProject();
    if (currentProject) {
      this.router.navigate(['/board'], {
        queryParams: { issueId: card.parentTaskId },
      });
    }
  }

  // Get a formatted issue ID for display
  getIssueId(card: Card): string {
    // Check if ordinalId is valid
    if (card.ordinalId && !isNaN(card.ordinalId)) {
      return card.ordinalId.toString();
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
}
