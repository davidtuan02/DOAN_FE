import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
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
import { filter, take } from 'rxjs/operators';
import {
  TeamPermissionsService,
  PermissionType,
} from '../../../../../core/services/team-permissions.service';
import { ProjectService } from '../../../../../core/services/project.service';
import { NzMessageService } from 'ng-zorro-antd/message';

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

  cards$!: Observable<Array<Card>>;
  loadingCardIds$!: Observable<Array<string>>;
  canCreateCards = false;

  contextMenuVisible: boolean = false;

  constructor(
    private store: Store<fromStore.AppState>,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private permissionsService: TeamPermissionsService,
    private projectService: ProjectService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadingCardIds$ = this.store.pipe(
      select(fromStore.selectLoadingCardIds)
    );

    // Check if user has permission to create cards
    this.projectService.selectedProject$.subscribe((project) => {
      if (project && project.team && project.team.id) {
        this.permissionsService
          .hasPermission(project.team.id, PermissionType.CREATE_TASK)
          .subscribe((hasPermission) => {
            this.canCreateCards = hasPermission;
          });
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.column && changes['column']) {
      this.cards$ = this.store.pipe(
        select(fromStore.selectCardsByColumnIdWithFilters(this.column.id))
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
      // Check if user has permission to move cards
      this.projectService.selectedProject$
        .pipe(take(1))
        .subscribe((project) => {
          if (project && project.team && project.team.id) {
            this.permissionsService
              .hasPermission(project.team.id, PermissionType.UPDATE_TASK)
              .subscribe((hasPermission) => {
                if (hasPermission) {
                  const partial: PartialCard = {
                    id: event.item.data,
                    columnId: event.container.id,
                  };
                  this.store.dispatch(fromStore.updateCard({ partial }));
                } else {
                  this.message.error(
                    'You do not have permission to update tasks'
                  );
                }
              });
          }
        });
    }
  }

  onCreateCard(card: Card): void {
    // Check permission before creating
    if (!this.canCreateCards) {
      this.message.error('You do not have permission to create tasks');
      return;
    }

    const newCard: Card = {
      ...card,
      columnId: this.column.id,
      id: nanoid(),
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
}
