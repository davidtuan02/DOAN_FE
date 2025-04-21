import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute, Params } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import {
  NzDropDownModule,
  NzDropdownMenuComponent,
} from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalService } from 'ng-zorro-antd/modal';
import { SvgIconComponent } from '../../../../../shared/components';
import { IssueService, Issue } from '../../../../services/issue.service';
import { takeUntilDestroyed } from '../../../../../shared/utils';
import {
  IssueStatus,
  IssuePriority,
  IssueType,
} from '../../../../../core/enums/issue.enum';
import { ProjectService } from '../../../../../core/services/project.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FilterService } from '../../../../services/filter/filter.service';
import {
  FilterCriteria,
  SavedFilter,
} from '../../../../../core/models/filter/filter.model';
import { SaveFilterDialogComponent } from '../../../filters/save-filter-dialog/save-filter-dialog.component';
import { UserService } from '../../../../../core/services/user.service';
import { Observable } from 'rxjs';
import { take, finalize, first } from 'rxjs/operators';

// Import the card-details component and related components
import { CardDetailsComponent } from '../../card/card-details/card-details.component';
import { CardDetailsPanelComponent } from '../../card/card-details-panel/card-details-panel.component';
import { CardDescriptionsPanelComponent } from '../../card/card-descriptions-panel/card-descriptions-panel.component';
import { CardDetailsLoaderComponent } from '../../card/card-details-loader/card-details-loader.component';
import { CardTypesEnum } from '../../../../../core/enums/card-types.enum';

// Import ngrx store
import * as fromStore from '../../../../../core/store';
import { Store } from '@ngrx/store';

// View type enum
export enum ViewType {
  LIST = 'list',
  DETAIL = 'detail',
}

@Component({
  selector: 'app-issues-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NzTableModule,
    NzDropDownModule,
    NzButtonModule,
    NzSelectModule,
    NzInputModule,
    NzTagModule,
    NzToolTipModule,
    NzIconModule,
    NzSkeletonModule,
    NzCheckboxModule,
    NzMenuModule,
    SvgIconComponent,
    CardDetailsComponent,
    CardDetailsPanelComponent,
    CardDescriptionsPanelComponent,
    CardDetailsLoaderComponent,
  ],
  templateUrl: './issues-page.component.html',
  styleUrls: ['./issues-page.component.scss'],
})
export class IssuesPageComponent implements OnInit {
  @ViewChild('typeMenu') typeMenu!: NzDropdownMenuComponent;
  @ViewChild('statusMenu') statusMenu!: NzDropdownMenuComponent;
  @ViewChild('assigneeMenu') assigneeMenu!: NzDropdownMenuComponent;

  issues: Issue[] = [];
  filteredIssues: Issue[] = [];
  loading = false;
  isLoadingFilters = false;
  searchTerm = '';
  statusFilter: string[] = [];
  priorityFilter: string[] = [];
  typeFilter: string[] = [];
  assigneeFilter: string[] = [];

  issueStatuses = ['To Do', 'In Progress', 'Review', 'Done'];
  issuePriorities = Object.values(IssuePriority);
  issueTypes = Object.values(IssueType);
  assignees: { id: string; name: string; avatar?: string }[] = [];

  typeMenuVisible = false;
  statusMenuVisible = false;
  assigneeMenuVisible = false;

  // View type and selected issue for detail view
  private _viewType: ViewType = ViewType.LIST;

  get viewType(): ViewType {
    return this._viewType;
  }

  set viewType(value: ViewType) {
    this._viewType = value;

    // When switching to DETAIL view, auto-select the first issue if nothing is selected
    if (
      value === ViewType.DETAIL &&
      !this.selectedIssue &&
      this.filteredIssues.length > 0
    ) {
      this.openCardDetail(this.filteredIssues[0]);
    } else if (value === ViewType.LIST) {
      // Clear selected card when switching to list view
      this.store.dispatch(fromStore.setSelectedCardId({ id: null }));
    }
  }

  selectedIssue: Issue | null = null;

  // Make view type enum available in template
  ViewType = ViewType;

  // Observable for saved filters
  savedFilters$: Observable<SavedFilter[]>;

  // Project filter properties
  projects: any[] = [];
  selectedProjectIds: string[] = [];
  projectSearchTerm: string = '';
  selectedProjectName: string = '';

  // Add this code near the other filter properties
  projectOperator: string = '=';

  constructor(
    private issueService: IssueService,
    private projectService: ProjectService,
    private filterService: FilterService,
    private router: Router,
    private route: ActivatedRoute,
    private message: NzMessageService,
    private modalService: NzModalService,
    private userService: UserService,
    private store: Store<fromStore.AppState>
  ) {
    this.savedFilters$ = this.filterService.savedFilters$;
  }

  ngOnInit(): void {
    // Load all available projects
    this.loadProjects();

    // Load issues first
    this.loadIssues();

    // Then check if we need to apply a filter from navigation
    this.checkForFilterInNavigation();

    // Load project-specific filters - with retry logic
    this.loadProjectFilters();
  }

  // Load project-specific filters with retry logic
  loadProjectFilters(): void {
    const selectedProject = this.projectService.getSelectedProject();
    if (selectedProject && selectedProject.id) {
      this.isLoadingFilters = true;
      this.filterService.loadProjectFilters(selectedProject.id);

      // Subscribe to the filters observable to know when loading is complete
      this.filterService.savedFilters$
        .pipe(
          take(1),
          finalize(() => {
            this.isLoadingFilters = false;
          })
        )
        .subscribe();
    } else {
      // If no project is selected, wait a bit and try again (project might be loading)
      setTimeout(() => {
        const selectedProject = this.projectService.getSelectedProject();
        if (selectedProject && selectedProject.id) {
          this.isLoadingFilters = true;
          this.filterService.loadProjectFilters(selectedProject.id);

          // Subscribe to the filters observable to know when loading is complete
          this.filterService.savedFilters$
            .pipe(
              take(1),
              finalize(() => {
                this.isLoadingFilters = false;
              })
            )
            .subscribe();
        } else {
          console.error('No project selected after retry, cannot load filters');
        }
      }, 1000);
    }
  }

  loadIssues(): void {
    const selectedProject = this.projectService.getSelectedProject();
    if (!selectedProject) {
      this.message.error('No project selected');
      return;
    }

    if (!selectedProject.id) {
      this.message.error('Invalid project ID');
      return;
    }

    this.loading = true;
    this.issueService
      .getIssuesByProjectId(selectedProject.id)
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: (issues) => {
          this.issues = issues;

          // Kiểm tra dữ liệu issues nhận được
          console.log('Loaded issues:', issues.length);
          if (issues.length > 0) {
            // Hiển thị mẫu dữ liệu để debug
            console.log('Sample issue:', {
              id: issues[0].id,
              title: issues[0].title,
              status: issues[0].status,
              type: issues[0].type,
              priority: issues[0].priority,
              assignee: issues[0].assignee,
            });

            // Tạo danh sách tất cả các trạng thái, loại và ưu tiên để debug
            const allStatuses = [...new Set(issues.map((i) => i.status))];
            const allTypes = [...new Set(issues.map((i) => i.type))];
            const allPriorities = [...new Set(issues.map((i) => i.priority))];

            console.log('All statuses in issues:', allStatuses);
            console.log('All types in issues:', allTypes);
            console.log('All priorities in issues:', allPriorities);
          }

          this.filteredIssues = [...issues];
          this.extractAssignees();
          this.loading = false;

          // If we have active filters, apply them again
          if (this.hasActiveFilters()) {
            this.applyFilters();
          }
        },
        error: (error) => {
          console.error('Failed to load issues', error);
          this.message.error('Failed to load issues');
          this.loading = false;
        },
      });
  }

  extractAssignees(): void {
    const assigneesMap = new Map<
      string,
      { id: string; name: string; avatar?: string }
    >();

    this.issues.forEach((issue) => {
      if (issue.assignee) {
        assigneesMap.set(issue.assignee.id, {
          id: issue.assignee.id,
          name: issue.assignee.name,
          avatar: issue.assignee.avatar || '',
        });
      }
    });

    this.assignees = Array.from(assigneesMap.values());
  }

  // Toggle dropdown menus
  toggleTypeFilter(): void {
    this.typeMenuVisible = !this.typeMenuVisible;
  }

  toggleStatusFilter(): void {
    this.statusMenuVisible = !this.statusMenuVisible;
  }

  toggleAssigneeFilter(): void {
    this.assigneeMenuVisible = !this.assigneeMenuVisible;
  }

  // Toggle filter selections
  toggleTypeSelection(type: string): void {
    const index = this.typeFilter.indexOf(type);
    if (index === -1) {
      this.typeFilter.push(type);
    } else {
      this.typeFilter.splice(index, 1);
    }
    this.applyFilters();
  }

  toggleStatusSelection(status: string): void {
    const index = this.statusFilter.indexOf(status);
    if (index === -1) {
      this.statusFilter.push(status);
    } else {
      this.statusFilter.splice(index, 1);
    }
    this.applyFilters();
  }

  toggleAssigneeSelection(assigneeId: string): void {
    const index = this.assigneeFilter.indexOf(assigneeId);
    if (index === -1) {
      this.assigneeFilter.push(assigneeId);
    } else {
      this.assigneeFilter.splice(index, 1);
    }
    this.applyFilters();
  }

  // Remove individual filters
  removeTypeFilter(type: string): void {
    const index = this.typeFilter.indexOf(type);
    if (index !== -1) {
      this.typeFilter.splice(index, 1);
      this.applyFilters();
    }
  }

  removeStatusFilter(status: string): void {
    const index = this.statusFilter.indexOf(status);
    if (index !== -1) {
      this.statusFilter.splice(index, 1);
      this.applyFilters();
    }
  }

  removeAssigneeFilter(assigneeId: string): void {
    const index = this.assigneeFilter.indexOf(assigneeId);
    if (index !== -1) {
      this.assigneeFilter.splice(index, 1);
      this.applyFilters();
    }
  }

  clearSearchTerm(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchTerm ||
      this.typeFilter.length > 0 ||
      this.statusFilter.length > 0 ||
      this.assigneeFilter.length > 0 ||
      this.selectedProjectIds.length > 0
    );
  }

  getAssigneeName(id: string): string {
    const assignee = this.assignees.find((a) => a.id === id);
    return assignee ? assignee.name : 'Unknown';
  }

  // Map old status enum values to new status display values
  mapStatusForDisplay(status: string): string {
    // Map old IssueStatus enum values to the display statuses
    switch (status) {
      case 'Backlog':
      case 'BACKLOG':
      case 'backlog':
        return 'To Do';

      case 'Selected':
      case 'SELECTED':
      case 'selected':
        return 'To Do';

      case 'InProgress':
      case 'IN_PROGRESS':
      case 'in_progress':
      case 'in-progress':
      case 'inprogress':
        return 'In Progress';

      case 'Done':
      case 'DONE':
      case 'done':
        return 'Done';

      case 'Review':
      case 'REVIEW':
      case 'review':
        return 'Review';

      default:
        // If it's already using the new format or unknown, return as is
        return status;
    }
  }

  // Map from display status to enum status - used when applying filters
  mapStatusToEnum(displayStatus: string): string[] {
    switch (displayStatus) {
      case 'To Do':
        return ['Backlog', 'Selected', 'TODO', 'To Do'];

      case 'In Progress':
        return ['InProgress', 'IN_PROGRESS', 'In Progress'];

      case 'Review':
        return ['Review', 'REVIEW'];

      case 'Done':
        return ['Done', 'DONE'];

      default:
        return [displayStatus];
    }
  }

  // Add this method with the other filter methods
  setProjectOperator(operator: string): void {
    this.projectOperator = operator;
    this.applyFilters();
  }

  // Update the applyFilters method to respect the project operator
  applyFilters(): void {
    let filtered = [...this.issues];

    // Apply text search if any
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.title.toLowerCase().includes(term) ||
          issue.description?.toLowerCase().includes(term) ||
          issue.key.toLowerCase().includes(term)
      );
    }

    // Apply type filter if any
    if (this.typeFilter.length > 0) {
      filtered = filtered.filter((issue) =>
        this.typeFilter.includes(issue.type)
      );
    }

    // Apply status filter if any
    if (this.statusFilter.length > 0) {
      filtered = filtered.filter((issue) =>
        this.statusFilter.includes(issue.status)
      );
    }

    // Apply assignee filter if any
    if (this.assigneeFilter.length > 0) {
      filtered = filtered.filter(
        (issue) =>
          issue.assignee && this.assigneeFilter.includes(issue.assignee.id)
      );
    }

    // Apply project filter if any
    if (this.selectedProjectIds.length > 0) {
      const currentProject = this.projectService.getSelectedProject();
      const currentProjectId = currentProject?.id || '';

      if (this.projectOperator === '=') {
        // Include issues from selected projects
        // All issues in the current view are from the selected project
        // This is a placeholder implementation since we don't have direct project IDs on issues
        if (
          currentProjectId &&
          !this.selectedProjectIds.includes(currentProjectId)
        ) {
          filtered = [];
        }
      } else if (this.projectOperator === '!=') {
        // Exclude issues from selected projects
        // If the current project is in the exclusion list, show no issues
        if (
          currentProjectId &&
          this.selectedProjectIds.includes(currentProjectId)
        ) {
          filtered = [];
        }
      }
    }

    this.filteredIssues = filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.typeFilter = [];
    this.statusFilter = [];
    this.assigneeFilter = [];
    this.selectedProjectIds = [];
    this.filteredIssues = [...this.issues];
  }

  saveFilter(): void {
    const selectedProject = this.projectService.getSelectedProject();

    if (!selectedProject || !selectedProject.id) {
      this.message.error('Không có dự án nào được chọn');
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.message.error('Bạn chưa đăng nhập');
      return;
    }

    // Create filter criteria object
    const criteria: FilterCriteria = {
      projectId: selectedProject.id,
      searchTerm: this.searchTerm.trim() || undefined,
      types: this.typeFilter.length > 0 ? [...this.typeFilter] : undefined,
      statuses:
        this.statusFilter.length > 0 ? [...this.statusFilter] : undefined,
      priorities:
        this.priorityFilter.length > 0 ? [...this.priorityFilter] : undefined,
      assigneeIds:
        this.assigneeFilter.length > 0 ? [...this.assigneeFilter] : undefined,
    };

    // Log the criteria object for debugging
    console.log('Filter criteria trước khi lưu:', criteria);

    // Kiểm tra xem có bất kỳ tiêu chí nào không
    const hasAnyCriteria = !!(
      criteria.searchTerm ||
      (criteria.types && criteria.types.length > 0) ||
      (criteria.statuses && criteria.statuses.length > 0) ||
      (criteria.priorities && criteria.priorities.length > 0) ||
      (criteria.assigneeIds && criteria.assigneeIds.length > 0)
    );

    if (!hasAnyCriteria) {
      // Nếu không có tiêu chí nào, hiển thị cảnh báo
      this.modalService.confirm({
        nzTitle: 'Bộ lọc trống',
        nzContent:
          'Bạn đang lưu một bộ lọc không có tiêu chí nào. Bạn có muốn tiếp tục không?',
        nzOkText: 'Tiếp tục',
        nzCancelText: 'Hủy',
        nzOnOk: () => this.openSaveFilterDialog(criteria),
      });
    } else {
      // Nếu có tiêu chí, mở hộp thoại lưu bộ lọc
      this.openSaveFilterDialog(criteria);
    }
  }

  // Helper method to open save filter dialog
  private openSaveFilterDialog(criteria: FilterCriteria): void {
    this.modalService
      .create<SaveFilterDialogComponent>({
        nzTitle: 'Lưu bộ lọc',
        nzContent: SaveFilterDialogComponent,
        nzData: {
          filterCriteria: criteria,
        },
        nzFooter: null,
        nzWidth: 500,
      })
      .afterClose.subscribe((result) => {
        if (result) {
          if (result.error) {
            // Handle error returned from dialog
            this.message.error(result.message || 'Không thể lưu bộ lọc');
          } else {
            // Successfully saved filter
            this.message.success(
              `Bộ lọc "${result.name}" đã được lưu thành công`
            );
            // Refresh saved filters list
            const selectedProject = this.projectService.getSelectedProject();
            if (selectedProject && selectedProject.id) {
              this.filterService.loadProjectFilters(selectedProject.id);
            }
          }
        }
      });
  }

  // Add a method to convert Issue to Card format if needed
  convertIssueToCard(issue: Issue): any {
    // Convert issue to the card format expected by the store
    console.log('Converting issue to card:', issue);

    // Chuẩn hóa status
    let status = issue.status;
    if (status) {
      if (
        [
          'Backlog',
          'BACKLOG',
          'backlog',
          'Selected',
          'SELECTED',
          'selected',
          'To Do',
          'TODO',
        ].includes(status)
      ) {
        status = 'To Do';
      } else if (
        [
          'InProgress',
          'IN_PROGRESS',
          'in_progress',
          'in-progress',
          'inprogress',
          'In Progress',
        ].includes(status)
      ) {
        status = 'In Progress';
      }
    }

    // Map issue type to CardTypesEnum
    let cardType;
    if (issue.type === 'Sub-task') {
      cardType = CardTypesEnum.SUB_TASK;
    } else if (issue.type === 'Bug') {
      cardType = CardTypesEnum.BUG;
    } else if (issue.type === 'Story') {
      cardType = CardTypesEnum.STORY;
    } else {
      cardType = CardTypesEnum.TASK;
    }

    // Tạo key cho card nếu không có
    const key =
      issue.key || `${issue.type.substring(0, 1)}-${issue.id.substring(0, 6)}`;

    // Bổ sung thêm các trường cần thiết
    const card = {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      type: cardType,
      priority: issue.priority,
      status: status,
      key: key,
      assigneeId: issue.assignee?.id,
      reporterId: issue.reporter?.id,
      created: issue.created,
      updated: issue.updated,
      // Thêm các trường cần thiết khác cho card-details
      columnId: this.getColumnIdFromStatus(status),
      estimate: (issue as any).estimate || 0,
      ordinalId: parseInt(issue.key?.replace(/[^\d]/g, '') || '0', 10) || 0,
      labels: issue.labels || [],
      createdAt: issue.created,
      updatedAt: issue.updated,
      // Add parent task ID if available
      parentTaskId: issue.parentTask?.id || null,
      storyPoints: issue.storyPoints || 0,
      startDate: issue.startDate || null,
      dueDate: issue.dueDate || null,
    };

    console.log('Converted card:', card);
    return card;
  }

  // Helper method to get columnId from status
  private getColumnIdFromStatus(status: string): string {
    switch (status) {
      case 'To Do':
        return 'todo';
      case 'In Progress':
        return 'inprogress';
      case 'Review':
        return 'review';
      case 'Done':
        return 'done';
      default:
        return 'todo';
    }
  }

  // Thêm phương thức để đảm bảo card được lưu trong store
  ensureCardInStore(issue: Issue): void {
    // Kiểm tra xem thẻ đã có trong store chưa
    this.store
      .select(fromStore.allCardEntities)
      .pipe(first())
      .subscribe((entities) => {
        if (!entities || !entities[issue.id]) {
          console.log(
            'Card not found in store, creating a card reference with ID:',
            issue.id
          );

          // Tạo một card đầy đủ từ issue
          const fullCard = this.convertIssueToCard(issue);

          // Instead of creating a new card, just update the store with the card data
          // This prevents duplicate creation on the backend
          this.store.dispatch(
            fromStore.createCardSuccess({ card: fullCard as any })
          );
          console.log(
            'Dispatched createCardSuccess for card display:',
            fullCard
          );
        } else {
          console.log(
            'Card already exists in store, using existing data:',
            entities[issue.id]
          );
          // Không cần update task, chỉ cần sử dụng dữ liệu hiện có trong store
          // Bỏ đoạn code gọi updateCard không cần thiết
        }

        // Sau khi đảm bảo card đã trong store, set nó làm selected
        setTimeout(() => {
          this.store.dispatch(fromStore.setSelectedCardId({ id: issue.id }));
          console.log(
            'Set selected card ID after ensuring card in store:',
            issue.id
          );
        }, 50);
      });
  }

  // Cập nhật phương thức openCardDetail để sử dụng phương thức mới
  openCardDetail(issue: Issue): void {
    // First, update selectedIssue for compatibility
    this.selectedIssue = issue;

    // Đảm bảo card được lưu trong store
    this.ensureCardInStore(issue);

    // Set view type to DETAIL
    this.viewType = ViewType.DETAIL;

    // Kiểm tra dữ liệu sau một khoảng thời gian
    setTimeout(() => {
      this.checkSelectedCardInStore(issue.id);
    }, 200);
  }

  // Update the viewIssueDetail method to use openCardDetail
  viewIssueDetail(issueId: string): void {
    // Find the issue by ID
    const issue = this.issues.find((i) => i.id === issueId);
    if (issue) {
      this.openCardDetail(issue);
    } else {
      // If issue not found, navigate to issue page
      this.router.navigate(['/issues', issueId]);
    }
  }

  // Update the switchToListView method
  switchToListView(): void {
    this.viewType = ViewType.LIST;
    this.selectedIssue = null;
    // Clear selected card in the store
    this.store.dispatch(fromStore.setSelectedCardId({ id: null }));
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'To Do':
        return 'blue';
      case 'In Progress':
        return 'gold';
      case 'Review':
        return 'purple';
      case 'Done':
        return 'green';
      default:
        return 'default';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Highest':
        return 'red';
      case 'High':
        return 'orange';
      case 'Medium':
        return 'yellow';
      case 'Low':
        return 'blue';
      case 'Lowest':
        return 'cyan';
      default:
        return 'blue';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'Epic':
        return 'fa-bolt';
      case 'Story':
        return 'fa-book';
      case 'Task':
        return 'fa-check-square';
      case 'Bug':
        return 'fa-bug';
      case 'Sub-task':
        return 'fa-tasks';
      default:
        return 'fa-file';
    }
  }

  // Check if a filter was passed via navigation
  checkForFilterInNavigation(): void {
    // Check for filter in navigation state (direct navigation from filter detail)
    const navigation = this.router.getCurrentNavigation();
    const filterState = navigation?.extras?.state?.['filter'];

    if (filterState) {
      this.applyFilterFromSaved(filterState);
      return;
    }

    // Check for filterId in query params (url sharing)
    this.route.queryParams.subscribe((params: Params) => {
      const filterId = params['filterId'];
      if (filterId) {
        this.filterService.getFilter(filterId).subscribe({
          next: (filter) => {
            this.applyFilterFromSaved(filter);
          },
          error: () => {
            this.message.error(
              'Failed to load filter. It may have been deleted or you do not have access to it.'
            );
          },
        });
      }
    });
  }

  // Apply a saved filter to the current issues page
  applyFilterFromSaved(filter: SavedFilter): void {
    // Log filter being applied to help debug
    console.log('Applying saved filter:', filter);

    // Clear any existing filters
    this.clearFilters();

    const criteria = filter.criteria;

    // Apply search term
    if (criteria.searchTerm) {
      this.searchTerm = criteria.searchTerm;
    }

    // Apply type filters
    if (criteria.types && criteria.types.length > 0) {
      this.typeFilter = [...criteria.types];
      console.log('Applied type filter:', this.typeFilter);
    }

    // Apply status filters
    if (criteria.statuses && criteria.statuses.length > 0) {
      // Chuẩn hóa các giá trị trạng thái để đảm bảo chúng khớp với các trạng thái hiển thị
      this.statusFilter = criteria.statuses.map((status) => {
        // Nếu đây là một giá trị enum, chuyển đổi nó thành giá trị hiển thị
        const displayStatus = this.mapStatusForDisplay(status);
        console.log(`Mapping status filter: ${status} -> ${displayStatus}`);
        return displayStatus;
      });
      console.log('Applied status filter:', this.statusFilter);
    }

    // Apply priority filters
    if (criteria.priorities && criteria.priorities.length > 0) {
      this.priorityFilter = [...criteria.priorities];
      console.log('Applied priority filter:', this.priorityFilter);
    }

    // Apply assignee filters
    if (criteria.assigneeIds && criteria.assigneeIds.length > 0) {
      this.assigneeFilter = [...criteria.assigneeIds];
      console.log('Applied assignee filter:', this.assigneeFilter);
    }

    // Apply all filters
    this.applyFilters();

    // Show confirmation message
    this.message.success(`Đã áp dụng bộ lọc "${filter.name}" thành công`);
  }

  // Thêm phương thức checkSelectedCardInStore
  checkSelectedCardInStore(issueId: string): void {
    // Kiểm tra xem card có trong store không
    this.store
      .select(fromStore.selectSelectedCardId)
      .pipe(first())
      .subscribe((selectedId) => {
        console.log('Current selected card ID in store:', selectedId);
        if (selectedId !== issueId) {
          console.warn(
            'Selected card ID mismatch. Expected:',
            issueId,
            'Got:',
            selectedId
          );
        }
      });

    // Kiểm tra xem card có nội dung không
    this.store
      .select(fromStore.selectSelectedCard)
      .pipe(first())
      .subscribe((card) => {
        console.log('Selected card in store:', card);
        if (!card) {
          console.warn('Selected card is null or undefined in store');
        } else if (card.id !== issueId) {
          console.warn('Card ID mismatch. Expected:', issueId, 'Got:', card.id);
        }
      });
  }

  // Filter projects based on search term
  get filteredProjects(): any[] {
    if (!this.projectSearchTerm.trim()) {
      return this.projects;
    }

    const search = this.projectSearchTerm.toLowerCase().trim();
    return this.projects.filter((project) =>
      project.name.toLowerCase().includes(search)
    );
  }

  // Check if a project is selected
  isProjectSelected(projectId: string): boolean {
    return this.selectedProjectIds.includes(projectId);
  }

  // Toggle project selection
  toggleProjectSelection(projectId: string): void {
    const index = this.selectedProjectIds.indexOf(projectId);
    if (index === -1) {
      // If only allowing one project at a time:
      this.selectedProjectIds = [projectId];
      const project = this.projects.find((p) => p.id === projectId);
      if (project) {
        this.selectedProjectName = project.name;
      }
    } else {
      this.selectedProjectIds.splice(index, 1);
      this.selectedProjectName = '';
    }

    // Reload issues for the selected project
    this.loadIssuesForSelectedProjects();
  }

  // Clear project selection
  clearProjectSelection(): void {
    this.selectedProjectIds = [];
    this.selectedProjectName = '';

    // Reset to default project
    const defaultProject = this.projectService.getSelectedProject();
    if (defaultProject) {
      this.loadIssues();
    }
  }

  // Load issues for selected projects
  loadIssuesForSelectedProjects(): void {
    if (this.selectedProjectIds.length === 0) {
      // If no project is selected, use the default project
      this.loadIssues();
      return;
    }

    this.loading = true;
    // For now, just load the first selected project
    const projectId = this.selectedProjectIds[0];

    this.issueService
      .getIssuesByProjectId(projectId)
      .pipe(takeUntilDestroyed(this))
      .subscribe({
        next: (issues) => {
          this.issues = issues;
          this.filteredIssues = [...issues];
          this.extractAssignees();
          this.loading = false;

          // If we have active filters, apply them again
          if (this.hasActiveFilters()) {
            this.applyFilters();
          }
        },
        error: (error) => {
          console.error('Failed to load issues for selected project', error);
          this.message.error('Failed to load issues for selected project');
          this.loading = false;
        },
      });
  }

  // Add method to load projects
  loadProjects(): void {
    // Get projects from ProjectService
    this.projectService.getAllProjects().subscribe({
      next: (projects: any[]) => {
        this.projects = projects;

        // Set current project as selected by default
        const currentProject = this.projectService.getSelectedProject();
        if (currentProject && currentProject.id) {
          this.selectedProjectIds = [currentProject.id];
          this.selectedProjectName = currentProject.name || '';
        }
      },
      error: (error: any) => {
        console.error('Failed to load projects', error);
        this.message.error('Failed to load projects');
      },
    });
  }

  // Add this method for displaying the project filter tag
  getSelectedProjectsLabel(): string {
    if (!this.selectedProjectIds || this.selectedProjectIds.length === 0) {
      return '';
    }

    const selectedProjects = this.projects.filter((p) =>
      this.selectedProjectIds.includes(p.id)
    );

    if (selectedProjects.length === 1) {
      return selectedProjects[0].name;
    } else if (selectedProjects.length <= 3) {
      return selectedProjects.map((p) => p.name).join(', ');
    } else {
      return `${selectedProjects.length} projects`;
    }
  }
}
