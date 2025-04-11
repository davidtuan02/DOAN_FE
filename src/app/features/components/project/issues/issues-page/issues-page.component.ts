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
      this.searchTerm.trim() !== '' ||
      this.typeFilter.length > 0 ||
      this.statusFilter.length > 0 ||
      this.assigneeFilter.length > 0
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

  applyFilters(): void {
    console.log('Applying filters with:', {
      searchTerm: this.searchTerm,
      statusFilter: this.statusFilter,
      typeFilter: this.typeFilter,
      priorityFilter: this.priorityFilter,
      assigneeFilter: this.assigneeFilter,
    });

    let filtered = [...this.issues];

    // Apply search term filter
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (issue) =>
          issue.title.toLowerCase().includes(search) ||
          (issue.description &&
            issue.description.toLowerCase().includes(search))
      );
      console.log('After search filter:', filtered.length);
    }

    // Apply status filter
    if (this.statusFilter.length > 0) {
      filtered = filtered.filter((issue) => {
        // Đầu tiên ánh xạ trạng thái issue sang dạng hiển thị
        const displayStatus = this.mapStatusForDisplay(issue.status);

        // Kiểm tra xem displayStatus có nằm trong các statusFilter không
        let result = this.statusFilter.includes(displayStatus);

        // Nếu không khớp trực tiếp, thử kiểm tra bằng cách ánh xạ ngược
        if (!result) {
          // Chuyển đổi tất cả các statusFilter thành các giá trị enum tương ứng
          const possibleStatusValues = this.statusFilter.flatMap((s) =>
            this.mapStatusToEnum(s)
          );
          // Kiểm tra xem issue.status có nằm trong danh sách giá trị enum không
          result = possibleStatusValues.includes(issue.status);
        }

        if (!result) {
          console.log(
            `Status mismatch: Issue status "${
              issue.status
            }" -> "${displayStatus}" not in ${JSON.stringify(
              this.statusFilter
            )}`
          );
          console.log(
            `Attempted matching with: ${JSON.stringify(
              this.statusFilter.flatMap((s) => this.mapStatusToEnum(s))
            )}`
          );
        }
        return result;
      });
      console.log('After status filter:', filtered.length);
    }

    // Apply priority filter
    if (this.priorityFilter.length > 0) {
      filtered = filtered.filter((issue) => {
        const result = this.priorityFilter.includes(issue.priority);
        if (!result) {
          console.log(
            `Priority mismatch: "${issue.priority}" not in ${JSON.stringify(
              this.priorityFilter
            )}`
          );
        }
        return result;
      });
      console.log('After priority filter:', filtered.length);
    }

    // Apply type filter
    if (this.typeFilter.length > 0) {
      filtered = filtered.filter((issue) => {
        const result = this.typeFilter.includes(issue.type);
        if (!result) {
          console.log(
            `Type mismatch: "${issue.type}" not in ${JSON.stringify(
              this.typeFilter
            )}`
          );
        }
        return result;
      });
      console.log('After type filter:', filtered.length);
    }

    // Apply assignee filter
    if (this.assigneeFilter.length > 0) {
      filtered = filtered.filter((issue) => {
        const result =
          issue.assignee && this.assigneeFilter.includes(issue.assignee.id);
        if (!result) {
          console.log(
            `Assignee mismatch: "${
              issue.assignee?.id || 'none'
            }" not in ${JSON.stringify(this.assigneeFilter)}`
          );
        }
        return result;
      });
      console.log('After assignee filter:', filtered.length);
    }

    this.filteredIssues = filtered;
    console.log('Final filtered issues:', this.filteredIssues.length);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = [];
    this.priorityFilter = [];
    this.typeFilter = [];
    this.assigneeFilter = [];
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

    // Tạo key cho card nếu không có
    const key =
      issue.key || `${issue.type.substring(0, 1)}-${issue.id.substring(0, 6)}`;

    // Bổ sung thêm các trường cần thiết
    const card = {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      type: issue.type,
      priority: issue.priority,
      status: status,
      key: key,
      assigneeId: issue.assignee?.id,
      reporterId: issue.reporter?.id,
      created: issue.created,
      updated: issue.updated,
      // Thêm các trường cần thiết khác cho card-details
      columnId: (issue as any).columnId || 'default',
      estimate: (issue as any).estimate || 0,
      ordinalId: parseInt(issue.key?.replace(/[^\d]/g, '') || '0', 10) || 0,
      labels: issue.labels || [],
    };

    console.log('Converted card:', card);
    return card;
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
            'Card not found in store, creating a full card with ID:',
            issue.id
          );

          // Tạo một card đầy đủ từ issue
          const fullCard = this.convertIssueToCard(issue);

          // Tạo một card mới thay vì chỉ update
          // Sử dụng createCard action thay vì updateCard
          try {
            this.store.dispatch(
              fromStore.createCard({ card: fullCard as any })
            );
            console.log('Dispatched createCard for new card:', fullCard);
          } catch (error) {
            console.error('Error creating card:', error);

            // Fallback to updateCard if createCard fails
            this.store.dispatch(fromStore.updateCard({ partial: fullCard }));
            console.log('Fallback: Used updateCard instead');
          }
        } else {
          console.log('Card already exists in store:', entities[issue.id]);
          // Update existing card with latest data
          const card = this.convertIssueToCard(issue);
          this.store.dispatch(fromStore.updateCard({ partial: card }));
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
}
