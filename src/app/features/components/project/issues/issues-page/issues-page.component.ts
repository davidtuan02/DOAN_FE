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

  constructor(
    private issueService: IssueService,
    private projectService: ProjectService,
    private filterService: FilterService,
    private router: Router,
    private route: ActivatedRoute,
    private message: NzMessageService,
    private modalService: NzModalService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadIssues();
    this.checkForFilterInNavigation();
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
          this.filteredIssues = [...issues];
          this.extractAssignees();
          this.loading = false;
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
        return 'To Do';
      case 'Selected':
        return 'To Do';
      case 'InProgress':
        return 'In Progress';
      case 'Done':
        return 'Done';
      default:
        // If it's already using the new format or unknown, return as is
        return status;
    }
  }

  applyFilters(): void {
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
    }

    // Apply status filter
    if (this.statusFilter.length > 0) {
      filtered = filtered.filter((issue) => {
        const displayStatus = this.mapStatusForDisplay(issue.status);
        return this.statusFilter.includes(displayStatus);
      });
    }

    // Apply priority filter
    if (this.priorityFilter.length > 0) {
      filtered = filtered.filter((issue) =>
        this.priorityFilter.includes(issue.priority)
      );
    }

    // Apply type filter
    if (this.typeFilter.length > 0) {
      filtered = filtered.filter((issue) =>
        this.typeFilter.includes(issue.type)
      );
    }

    // Apply assignee filter
    if (this.assigneeFilter.length > 0) {
      filtered = filtered.filter(
        (issue) =>
          issue.assignee && this.assigneeFilter.includes(issue.assignee.id)
      );
    }

    this.filteredIssues = filtered;
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
      this.message.error('No project selected');
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.message.error('No user is logged in');
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

    // Show save filter dialog
    this.modalService
      .create<SaveFilterDialogComponent>({
        nzTitle: 'Save Filter',
        nzContent: SaveFilterDialogComponent,
        nzData: {
          filterCriteria: criteria,
        },
        nzFooter: null,
        nzWidth: 500,
      })
      .afterClose.subscribe((result) => {
        if (result) {
          this.message.success(`Filter "${result.name}" saved successfully`);
        }
      });
  }

  viewIssueDetail(issueId: string): void {
    this.router.navigate(['/issues', issueId]);
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
    }

    // Apply status filters
    if (criteria.statuses && criteria.statuses.length > 0) {
      this.statusFilter = [...criteria.statuses];
    }

    // Apply priority filters
    if (criteria.priorities && criteria.priorities.length > 0) {
      this.priorityFilter = [...criteria.priorities];
    }

    // Apply assignee filters
    if (criteria.assigneeIds && criteria.assigneeIds.length > 0) {
      this.assigneeFilter = [...criteria.assigneeIds];
    }

    // Apply all filters
    this.applyFilters();

    // Show confirmation message
    this.message.success(`Filter "${filter.name}" applied successfully`);
  }
}
