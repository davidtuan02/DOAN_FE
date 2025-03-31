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

  onCloseModal(): void {
    if (this.modalData && this.modalData.onClose) {
      this.modalData.onClose();
    }
  }

  onContextMenuClick(): void {
    this.contextMenuVisible = false;
  }
}
