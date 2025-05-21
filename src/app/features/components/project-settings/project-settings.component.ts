import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { SvgIconComponent } from '../../../shared/components';
import { FormsModule } from '@angular/forms';
import {
  ProjectService,
  Project,
} from '../../../core/services/project.service';
import { finalize } from 'rxjs/operators';
import { ProjectColumnsService } from '../../../core/services/project-columns.service';
import {
  ProjectColumn,
  ProjectColumnCreateDto,
  ProjectColumnUpdateDto,
  ReorderColumnsDto,
} from '../../../core/models/project-column.model';
import { BoardColumnsSettingsComponent } from './board-columns-settings/board-columns-settings.component';

// Define extended project interface with the additional properties needed
interface ExtendedProject extends Project {
  category?: string;
  type?: string;
  lead?: string;
  avatar?: string | null;
}

// Định nghĩa interface cho BoardStatus và BoardColumn
interface BoardStatus {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface BoardColumn {
  id: string;
  name: string;
  order: number;
  color: string;
  statuses: BoardStatus[];
}

@Component({
  selector: 'app-project-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SvgIconComponent,
    FormsModule,
    BoardColumnsSettingsComponent,
  ],
  templateUrl: './project-settings.component.html',
})
export class ProjectSettingsComponent implements OnInit {
  project: ExtendedProject = {
    name: '',
    key: '',
    description: '',
    lead: '',
    category: 'Software',
    type: 'Software',
    avatar: null,
  };

  projectId: string = '';
  loading: boolean = false;
  columnsLoading: boolean = false;
  error: string | null = null;
  columnsError: string | null = null;

  settingsTabs = [
    {
      id: 'details',
      label: 'Details',
      icon: 'settings',
      active: true,
    },
    // {
    //   id: 'access',
    //   label: 'Access',
    //   icon: 'lock',
    //   active: false,
    // },
    // {
    //   id: 'notifications',
    //   label: 'Notifications',
    //   icon: 'bell',
    //   active: false,
    // },
    {
      id: 'columns',
      label: 'Columns and statuses',
      icon: 'board',
      active: false,
    },
    {
      id: 'filters',
      label: 'Custom filters',
      icon: 'search',
      active: false,
    },
  ];

  // Columns and statuses data
  columns: BoardColumn[] = [
    {
      id: 'todo',
      name: 'To Do',
      order: 0,
      color: '#0052CC',
      statuses: [
        { id: 'backlog', name: 'Backlog', order: 0, color: '#6B778C' },
        {
          id: 'selected',
          name: 'Selected for Development',
          order: 1,
          color: '#6B778C',
        },
      ],
    },
    {
      id: 'inprogress',
      name: 'In Progress',
      order: 1,
      color: '#0052CC',
      statuses: [
        { id: 'inprogress', name: 'In Progress', order: 0, color: '#0052CC' },
      ],
    },
    {
      id: 'done',
      name: 'Done',
      order: 2,
      color: '#36B37E',
      statuses: [{ id: 'done', name: 'Done', order: 0, color: '#36B37E' }],
    },
  ];

  // Column/status being edited
  editingColumn: string | null = null;
  editingStatus: { columnId: string; statusId: string } | null = null;

  // Temporary new column/status data
  newColumn = { name: '' };
  newStatus: { [columnId: string]: { name: string; color: string } } = {};

  // Custom filters data
  filters = [
    {
      id: 'my-issues',
      name: 'My Issues',
      description: 'Issues assigned to me',
      query: 'assignee = currentUser()',
      isShared: false,
    },
    {
      id: 'recently-updated',
      name: 'Recently Updated',
      description: 'Issues updated in the last 7 days',
      query: 'updated >= -7d',
      isShared: true,
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private projectColumnsService: ProjectColumnsService
  ) {}

  ngOnInit(): void {
    // Thử lấy ID từ route params
    this.projectId = this.route.snapshot.paramMap.get('id') || '';

    if (this.projectId) {
      // Nếu có ID trong route, load project theo ID đó
      this.loadProjectById(this.projectId);
    } else {
      // Nếu không có ID trong route, lấy project hiện tại từ service
      const selectedProject = this.projectService.getSelectedProject();

      if (selectedProject && selectedProject.id) {
        this.projectId = selectedProject.id;
        this.loadProjectById(this.projectId);
      } else {
        this.error = 'No project selected. Please select a project first.';
      }
    }
  }

  loadProjectById(id: string): void {
    this.loading = true;
    this.projectService
      .getProjectById(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (project: Project) => {
          console.log('Project loaded successfully:', project);
          // Copy project data to our project object
          this.project = {
            ...project,
            // Set default values for properties that might be missing
            category: 'Software',
            type: 'Software',
            lead: '',
          };
        },
        error: (err: Error) => {
          this.error = err.message || 'Failed to load project details';
          console.error('Error loading project:', err);
        },
      });
  }

  loadColumnsAndStatuses(): void {
    // Real API implementation using ProjectColumnsService
    this.columnsLoading = true;
    this.columnsError = null;

    this.projectColumnsService
      .getProjectColumns(this.projectId)
      .pipe(finalize(() => (this.columnsLoading = false)))
      .subscribe({
        next: (columns: ProjectColumn[]) => {
          // Map API columns to BoardColumn format
          this.columns = columns.map((col) => ({
            id: col.id,
            name: col.name,
            order: col.order,
            color: col.color || '#0052CC',
            statuses: [], // In a real implementation, you would load statuses separately
          }));

          // Sort columns by order
          this.columns.sort((a, b) => a.order - b.order);
        },
        error: (err: Error) => {
          this.columnsError = err.message || 'Failed to load columns';
          console.error('Error loading columns:', err);
        },
      });
  }

  onTabClick(tabId: string): void {
    this.settingsTabs.forEach((tab) => {
      tab.active = tab.id === tabId;
    });

    // Nếu chọn tab columns, load columns và statuses
    if (tabId === 'columns') {
      this.loadColumnsAndStatuses();
    }
  }

  onSave(): void {
    this.loading = true;

    const updateData = {
      name: this.project.name,
      description: this.project.description,
      key: this.project.key,
    };

    this.projectService
      .updateProject(this.projectId, updateData)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (updatedProject: Project) => {
          console.log('Project updated successfully:', updatedProject);
        },
        error: (err: Error) => {
          this.error = err.message || 'Failed to update project';
          console.error('Error updating project:', err);
        },
      });
  }

  // Columns and statuses methods
  addColumn(): void {
    if (!this.newColumn.name.trim()) {
      this.columnsError = 'Column name cannot be empty';
      return;
    }

    const newColumnData: ProjectColumnCreateDto = {
      name: this.newColumn.name,
      projectId: this.projectId,
      order: this.columns.length,
      color: '#0052CC',
    };

    this.columnsLoading = true;
    this.projectColumnsService
      .createColumn(this.projectId, newColumnData)
      .pipe(finalize(() => (this.columnsLoading = false)))
      .subscribe({
        next: (column: ProjectColumn) => {
          // Add new column to the list
          this.columns.push({
            id: column.id,
            name: column.name,
            order: column.order,
            color: column.color || '#0052CC',
            statuses: [],
          });

          // Reset form
          this.newColumn = { name: '' };
        },
        error: (err: Error) => {
          this.columnsError = err.message || 'Failed to create column';
          console.error('Error creating column:', err);
        },
      });
  }

  startEditingColumn(column: BoardColumn): void {
    this.editingColumn = column.id;
  }

  cancelEditingColumn(): void {
    this.editingColumn = null;
  }

  updateColumn(column: BoardColumn): void {
    if (!column.name.trim()) {
      this.columnsError = 'Column name cannot be empty';
      return;
    }

    const updateData: ProjectColumnUpdateDto = {
      id: column.id,
      name: column.name,
      order: column.order,
      color: column.color,
    };

    this.columnsLoading = true;
    this.projectColumnsService
      .updateColumn(this.projectId, column.id, updateData)
      .pipe(finalize(() => (this.columnsLoading = false)))
      .subscribe({
        next: (updatedColumn: ProjectColumn) => {
          // Update column in the list
          const index = this.columns.findIndex((c) => c.id === column.id);
          if (index !== -1) {
            this.columns[index] = {
              ...this.columns[index],
              name: updatedColumn.name,
              color: updatedColumn.color || '#0052CC',
              order: updatedColumn.order,
            };
          }

          this.editingColumn = null;
        },
        error: (err: Error) => {
          this.columnsError = err.message || 'Failed to update column';
          console.error('Error updating column:', err);
        },
      });
  }

  removeColumn(columnId: string): void {
    if (confirm('Are you sure you want to delete this column?')) {
      this.columnsLoading = true;
      this.projectColumnsService
        .deleteColumn(this.projectId, columnId)
        .pipe(finalize(() => (this.columnsLoading = false)))
        .subscribe({
          next: () => {
            // Remove column from the list
            this.columns = this.columns.filter((col) => col.id !== columnId);
          },
          error: (err: Error) => {
            this.columnsError = err.message || 'Failed to delete column';
            console.error('Error deleting column:', err);
          },
        });
    }
  }

  reorderColumns(event: any): void {
    // Update local order first
    this.columns.forEach((column, index) => {
      column.order = index;
    });

    // Prepare data for API call
    const reorderData: ReorderColumnsDto = {
      projectId: this.projectId,
      columnOrders: this.columns.map((column) => ({
        id: column.id,
        order: column.order,
      })),
    };

    // Call API to update order in backend
    this.columnsLoading = true;
    this.projectColumnsService
      .reorderColumns(this.projectId, reorderData)
      .pipe(finalize(() => (this.columnsLoading = false)))
      .subscribe({
        next: (columns: ProjectColumn[]) => {
          // Update local columns with the response if needed
          console.log('Columns reordered successfully:', columns);
        },
        error: (err: Error) => {
          this.columnsError = err.message || 'Failed to reorder columns';
          console.error('Error reordering columns:', err);
        },
      });
  }

  initNewStatus(columnId: string): void {
    this.newStatus[columnId] = { name: '', color: '#6B778C' };
  }

  cancelNewStatus(columnId: string): void {
    delete this.newStatus[columnId];
  }

  addStatus(columnId: string): void {
    if (!this.newStatus[columnId] || !this.newStatus[columnId].name.trim()) {
      this.columnsError = 'Status name cannot be empty';
      return;
    }

    // Mock implementation - tìm column và thêm status
    const column = this.columns.find((col) => col.id === columnId);
    if (column) {
      column.statuses.push({
        id: `status-${column.statuses.length + 1}`,
        name: this.newStatus[columnId].name,
        order: column.statuses.length,
        color: this.newStatus[columnId].color,
      });

      // Reset form
      delete this.newStatus[columnId];
    }
  }

  startEditingStatus(columnId: string, statusId: string): void {
    this.editingStatus = { columnId, statusId };
  }

  cancelEditingStatus(): void {
    this.editingStatus = null;
  }

  updateStatus(columnId: string, status: BoardStatus): void {
    if (!status.name.trim()) {
      this.columnsError = 'Status name cannot be empty';
      return;
    }

    // Mock implementation - tìm column và status và cập nhật
    const column = this.columns.find((c) => c.id === columnId);
    if (column) {
      const statusIndex = column.statuses.findIndex((s) => s.id === status.id);
      if (statusIndex !== -1) {
        column.statuses[statusIndex] = { ...status };
      }
    }

    this.editingStatus = null;
  }

  removeStatus(columnId: string, statusId: string): void {
    if (confirm('Are you sure you want to delete this status?')) {
      // Tìm column và xóa status
      const column = this.columns.find((col) => col.id === columnId);
      if (column) {
        column.statuses = column.statuses.filter(
          (status) => status.id !== statusId
        );
      }
    }
  }

  reorderStatuses(columnId: string, event: any): void {
    // Implement drag-and-drop reordering
    console.log('Reorder statuses:', columnId, event);
  }

  createDefaultColumnsAndStatuses(): void {
    if (
      confirm(
        'This will create a default set of columns and statuses. Proceed?'
      )
    ) {
      // Reset to default columns
      this.columns = [
        {
          id: 'todo',
          name: 'To Do',
          order: 0,
          color: '#0052CC',
          statuses: [
            { id: 'backlog', name: 'Backlog', order: 0, color: '#6B778C' },
            {
              id: 'selected',
              name: 'Selected for Development',
              order: 1,
              color: '#6B778C',
            },
          ],
        },
        {
          id: 'inprogress',
          name: 'In Progress',
          order: 1,
          color: '#0052CC',
          statuses: [
            {
              id: 'inprogress',
              name: 'In Progress',
              order: 0,
              color: '#0052CC',
            },
          ],
        },
        {
          id: 'done',
          name: 'Done',
          order: 2,
          color: '#36B37E',
          statuses: [{ id: 'done', name: 'Done', order: 0, color: '#36B37E' }],
        },
      ];
    }
  }

  // Custom filters methods
  addFilter(): void {
    this.filters.push({
      id: `filter-${this.filters.length + 1}`,
      name: 'New Filter',
      description: 'Enter filter description',
      query: '',
      isShared: false,
    });
  }

  removeFilter(filterId: string): void {
    this.filters = this.filters.filter((filter) => filter.id !== filterId);
  }

  toggleFilterShare(filterId: string): void {
    const filter = this.filters.find((f) => f.id === filterId);
    if (filter) {
      filter.isShared = !filter.isShared;
    }
  }
}
