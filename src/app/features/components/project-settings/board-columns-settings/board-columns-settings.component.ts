import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import {
  CdkDragDrop,
  moveItemInArray,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzIconModule } from 'ng-zorro-antd/icon';
import {
  BoardColumnService,
  BoardColumn,
  CreateBoardColumnDto,
  UpdateBoardColumnDto,
} from '../../../../core/services/board-column.service';
import { ProjectService } from '../../../../core/services/project.service';
import { SvgIconComponent } from '../../../../shared/components';
import { TeamRole } from '../../../../core/models/team-role.model';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-board-columns-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule,
    NzTableModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzCheckboxModule,
    NzColorPickerModule,
    NzDividerModule,
    NzPopconfirmModule,
    NzIconModule,
    SvgIconComponent,
  ],
  templateUrl: './board-columns-settings.component.html',
  styleUrls: ['./board-columns-settings.component.scss'],
})
export class BoardColumnsSettingsComponent implements OnInit {
  columns: BoardColumn[] = [];
  isLoading = false;
  isModalVisible = false;
  isEditMode = false;
  currentColumnId: string | null = null;
  error: string | null = null;
  columnForm: FormGroup;
  currentProjectId: string | null = null;
  currentBoardId: string | null = null;
  userTeamRole: TeamRole = TeamRole.MEMBER;
  canManageProject = false;

  constructor(
    private fb: FormBuilder,
    private boardColumnService: BoardColumnService,
    private projectService: ProjectService,
    private modal: NzModalService,
    private message: NzMessageService,
    private permissionService: PermissionService
  ) {
    this.columnForm = this.fb.group({
      name: ['', [Validators.required]],
      color: ['#1890FF'],
      description: [''],
      isDefault: [false],
    });
  }

  ngOnInit(): void {
    this.projectService.selectedProject$.subscribe((project) => {
      if (project && project.id) {
        this.currentProjectId = project.id;
        this.loadColumns();
      }
    });
    this.loadUserPermissions();
  }

  loadUserPermissions(): void {
    this.permissionService.getCurrentTeamRole().subscribe(role => {
      if (role) {
        this.userTeamRole = role;

        this.permissionService.canManageProject(role).subscribe(can => {
          this.canManageProject = can;
        });
      }
    });
  }

  loadColumns(): void {
    if (!this.currentProjectId) {
      this.error = 'No project selected';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.boardColumnService
      .getColumnsByProjectId(this.currentProjectId)
      .subscribe({
        next: (columns) => {
          this.columns = columns;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load columns';
          this.isLoading = false;
          console.error('Error loading columns:', err);
        },
      });
  }

  showAddColumnModal(): void {
    this.isEditMode = false;
    this.currentColumnId = null;
    this.columnForm.reset({ color: '#1890FF', isDefault: false });
    this.isModalVisible = true;
  }

  showEditColumnModal(column: BoardColumn): void {
    this.isEditMode = true;
    this.currentColumnId = column.id;
    this.columnForm.setValue({
      name: column.name,
      color: column.color || '#1890FF',
      description: column.description || '',
      isDefault: column.isDefault || false,
    });
    this.isModalVisible = true;
  }

  handleCancel(): void {
    this.isModalVisible = false;
  }

  handleSubmit(): void {
    if (this.columnForm.invalid) {
      Object.values(this.columnForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
      return;
    }

    if (!this.currentProjectId) {
      this.message.error('No project selected');
      return;
    }

    this.isLoading = true;

    if (this.isEditMode && this.currentColumnId) {
      // Update existing column
      const updateDto: UpdateBoardColumnDto = this.columnForm.value;
      this.boardColumnService
        .updateColumn(this.currentColumnId, updateDto)
        .subscribe({
          next: (updatedColumn) => {
            this.message.success('Column updated successfully');
            this.loadColumns();
            this.isModalVisible = false;
            this.isLoading = false;
          },
          error: (err) => {
            this.message.error('Failed to update column');
            this.isLoading = false;
            console.error('Error updating column:', err);
          },
        });
    } else {
      // Create new column
      const createDto: CreateBoardColumnDto = {
        ...this.columnForm.value,
        projectId: this.currentProjectId,
        order: this.columns.length, // Add to the end
      };

      this.boardColumnService.createColumn(createDto).subscribe({
        next: (newColumn) => {
          this.message.success('Column created successfully');
          this.loadColumns();
          this.isModalVisible = false;
          this.isLoading = false;
        },
        error: (err) => {
          this.message.error('Failed to create column');
          this.isLoading = false;
          console.error('Error creating column:', err);
        },
      });
    }
  }

  confirmDelete(column: BoardColumn): void {
    this.isLoading = true;
    this.boardColumnService.deleteColumn(column.id).subscribe({
      next: () => {
        this.message.success('Column deleted successfully');
        this.loadColumns();
        this.isLoading = false;
      },
      error: (err) => {
        this.message.error(
          'Failed to delete column: ' + (err.error?.message || 'Unknown error')
        );
        this.isLoading = false;
        console.error('Error deleting column:', err);
      },
    });
  }

  drop(event: CdkDragDrop<BoardColumn[]>): void {
    if (!this.currentProjectId) {
      this.message.error('No project selected');
      return;
    }

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    // Tạo một bản sao của danh sách columns
    const updatedColumns = [...this.columns];

    // Cập nhật vị trí trong mảng
    moveItemInArray(updatedColumns, event.previousIndex, event.currentIndex);

    // Cập nhật lại giá trị order dựa trên vị trí mới
    const columnOrders = updatedColumns.map((col, index) => ({
      id: col.id,
      order: index,
    }));

    console.log('Sending reorder request with data:', {
      projectId: this.currentProjectId,
      columnOrders: columnOrders,
    });

    this.isLoading = true;

    // Cập nhật hiển thị trước khi có phản hồi từ API
    this.columns = updatedColumns;

    this.boardColumnService
      .reorderColumns({
        projectId: this.currentProjectId,
        columnOrders,
      })
      .subscribe({
        next: (updatedColumns) => {
          console.log('Columns reordered successfully:', updatedColumns);
          this.columns = updatedColumns;
          this.isLoading = false;
          this.message.success('Columns reordered successfully');
        },
        error: (err) => {
          console.error('Error reordering columns:', err);
          this.message.error('Failed to reorder columns. Please try again.');
          this.loadColumns(); // Reload original order
          this.isLoading = false;
        },
      });
  }
}
