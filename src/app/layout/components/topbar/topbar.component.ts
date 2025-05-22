import { Component, OnInit, OnDestroy } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subscription } from 'rxjs';
import { tap, map, shareReplay } from 'rxjs/operators';
import { User } from '../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../shared/utils';
import { CommonModule } from '@angular/common';
import { SvgIconComponent, AvatarComponent } from '../../../shared/components';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Store } from '@ngrx/store';
import * as fromStore from '../../../core/store';
import {
  UserOutline,
  LogoutOutline,
  SettingOutline,
} from '@ant-design/icons-angular/icons';
import { Router, NavigationExtras, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserService } from '../../../core/services';
import { IssueService } from '../../../features/services/issue.service';
import {
  ProjectService,
  Project,
} from '../../../core/services/project.service';
import { NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { NotificationService } from '../../../services/notification.service';
import { NotificationListComponent } from '../../../shared/components/notification-list/notification-list.component';

interface TopbarMenuItem {
  name: string;
  selected: boolean;
  route: string;
}

// Interface extending Project for display in dropdown
interface ProjectDisplay {
  id?: string;
  name: string;
  key?: string;
  type: 'business' | 'software';
}

interface TaskItem {
  id: string;
  key: string;
  title: string;
  project: string;
  status: string;
}

interface BoardItem {
  id: string;
  name: string;
  project: string;
}

@Destroyable()
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    SvgIconComponent,
    AvatarComponent,
    NzInputModule,
    NzDropDownModule,
    NzIconModule,
    NzToolTipModule,
    NotificationListComponent,
    RouterModule
  ],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit, OnDestroy {
  currentUser$!: Observable<User>;
  protected readonly icons = {
    user: UserOutline,
    logout: LogoutOutline,
    setting: SettingOutline,
  };

  // Your Work dropdown properties
  activeWorkTab: 'assigned' | 'recent' | 'boards' = 'assigned';
  assignedTasks: TaskItem[] = [];
  recentTasks: TaskItem[] = [];
  boards: BoardItem[] = [];

  // Projects dropdown properties
  recentProjects: ProjectDisplay[] = [];

  topbarMenuItems: TopbarMenuItem[] = [
    { name: 'Your work', selected: false, route: '/your-work' },
    { name: 'Projects', selected: false, route: '/projects' },
    { name: 'Filters', selected: false, route: '/filters' },
    { name: 'People', selected: false, route: '/teams' },
    { name: 'Accounts', selected: false, route: '/accounts' },
  ];

  displayTopbarMenuItems: TopbarMenuItem[] = [];

  unreadNotificationCount = 0;
  isNotificationsOpen = false;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private store: Store<fromStore.AppState>,
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private userService: UserService,
    private issueService: IssueService,
    private projectService: ProjectService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.userService.getCurrentUser();

    // Load all users into the store
    this.store.dispatch(fromStore.getUsers());

    // Listen to router events to update selected state
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this)
      )
      .subscribe((event: any) => {
        this.updateSelectedMenuItem(event.url);
      });

    // Set initial selected state based on current URL
    this.updateSelectedMenuItem(this.router.url);

    // Always show all menu items
    this.displayTopbarMenuItems = this.topbarMenuItems;

    // Load initial data for Your Work dropdown
    this.loadAssignedTasks();
    this.loadRecentTasks();
    this.loadBoards();

    // Load recent projects for Projects dropdown
    this.loadRecentProjects();

    this.initializeNotifications();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Initialize notifications system
  private initializeNotifications(): void {
    // Subscribe to unread notifications count
    const countSub = this.notificationService.unreadCount$.subscribe(
      (count) => {
        this.unreadNotificationCount = count;
      }
    );
    this.subscriptions.add(countSub);

    // Initial load of unread count
    this.notificationService.getUnreadCount().subscribe();
  }

  // Toggle notifications dropdown
  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;

    if (this.isNotificationsOpen) {
      // Load notifications when opening the dropdown
      this.notificationService.getNotifications().subscribe({
        error: (err) => {
          console.error('Failed to load notifications', err);
          // Still keep the panel open even if there's an error
        },
      });
    }
  }

  // Method to set active tab in Your Work dropdown
  setActiveWorkTab(tab: 'assigned' | 'recent' | 'boards'): void {
    this.activeWorkTab = tab;
  }

  // Load tasks assigned to current user
  loadAssignedTasks(): void {
    this.userService.getCurrentUser().subscribe((user) => {
      if (!user || !user.id) {
        this.assignedTasks = [];
        return;
      }

      // Lấy các task được gán cho người dùng hiện tại từ API
      this.projectService.getCurrentUserProjects().subscribe((projects) => {
        if (projects.length === 0) {
          this.assignedTasks = [];
          return;
        }

        // Lấy các issue từ tất cả các project của người dùng
        const requests = projects.map((project) => {
          if (!project.id) return [];
          return this.issueService.getIssuesByProjectId(project.id);
        });

        // Kết hợp tất cả các issue và lọc những issue được gán cho người dùng hiện tại
        import('rxjs').then((rxjs) => {
          rxjs.forkJoin(requests).subscribe((issuesArrays) => {
            // Gộp tất cả các mảng issue thành một mảng duy nhất
            const allIssues = issuesArrays.flat() as any[];

            // Lọc những issue được gán cho người dùng hiện tại
            const assignedIssues = allIssues.filter(
              (issue) => issue.assignee && issue.assignee.id === user.id
            );

            // Chuyển đổi issue thành định dạng TaskItem
            this.assignedTasks = assignedIssues.map((issue) => ({
              id: issue.id,
              key: issue.key || issue.id.substring(0, 4).toUpperCase(),
              title: issue.title || issue.description || 'No title',
              project: this.getProjectName(
                this.getProjectIdFromIssue(issue),
                projects
              ),
              status: issue.status,
            }));
          });
        });
      });
    });
  }

  // Hàm helper để lấy projectId từ issue (kiểu dữ liệu khác nhau)
  private getProjectIdFromIssue(issue: any): string | undefined {
    // Kiểm tra các cách khác nhau mà projectId có thể được lưu trữ trong issue
    return issue.projectId || (issue.project && issue.project.id) || undefined;
  }

  // Hàm helper để lấy tên dự án
  private getProjectName(
    projectId: string | undefined,
    projects: any[]
  ): string {
    if (!projectId) return 'Unknown Project';
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  }

  // Load recently viewed tasks
  loadRecentTasks(): void {
    this.projectService.getCurrentUserProjects().subscribe((projects) => {
      if (projects.length === 0) {
        this.recentTasks = [];
        return;
      }

      // Lấy các issue từ project đầu tiên làm ví dụ
      const projectId = projects[0]?.id;
      if (!projectId) {
        this.recentTasks = [];
        return;
      }

      this.issueService.getIssuesByProjectId(projectId).subscribe((issues) => {
        // Xử lý issues như kiểu any để tránh lỗi TypeScript
        const issuesAny = issues as any[];

        // Sắp xếp theo ngày cập nhật để mô phỏng "gần đây nhất"
        const sortedIssues = issuesAny.sort((a, b) => {
          const dateA = new Date(a.updated || a.created || 0);
          const dateB = new Date(b.updated || b.created || 0);
          return dateB.getTime() - dateA.getTime();
        });

        // Chuyển đổi issue thành định dạng TaskItem
        this.recentTasks = sortedIssues.slice(0, 4).map((issue) => ({
          id: issue.id,
          key: issue.key || issue.id.substring(0, 4).toUpperCase(),
          title: issue.title || issue.description || 'No title',
          project: this.getProjectName(
            this.getProjectIdFromIssue(issue),
            projects
          ),
          status: issue.status,
        }));
      });
    });
  }

  // Load boards
  loadBoards(): void {
    // Lấy danh sách boards từ backend
    this.projectService.getCurrentUserProjects().subscribe((projects) => {
      // Trong trường hợp thực tế, cần một API endpoint riêng cho boards
      // Hiện tại giả định mỗi project có một board
      this.boards = projects
        .filter((project) => project.id)
        .map((project) => ({
          id: project.id || '',
          name: `${project.name} Board`,
          project: project.name,
        }));
        console.log(this.boards)
    });
  }

  // Close dropdown when clicking an item
  closeDropdown(): void {
    // This is handled automatically by ng-zorro
  }

  updateSelectedMenuItem(currentUrl: string): void {
    // Reset all items
    this.topbarMenuItems.forEach((item) => {
      item.selected = false;
    });

    // Set selected based on current URL
    if (currentUrl.includes('/teams')) {
      const peopleItem = this.topbarMenuItems.find(
        (item) => item.name === 'People'
      );
      if (peopleItem) {
        peopleItem.selected = true;
      }
    } else {
      // Check other routes
      for (const item of this.topbarMenuItems) {
        if (currentUrl.startsWith(item.route) && item.route !== '/teams') {
          item.selected = true;
          break;
        }
      }
    }
  }

  onMenuItemClick(route: string): void {
    this.router.navigate([route]);
  }

  navigateTo(route: string, extras?: NavigationExtras): void {
    this.router.navigate([route], extras);
  }

  onProfileClick(): void {
    this.router.navigate(['/profile']);
  }

  onLogoutClick(): void {
    this.store.dispatch(fromStore.logout());
    this.router.navigate(['/login']);
  }

  // Navigate to a route and close dropdown
  navigateAndCloseDropdown(route: string): void {
    // Đóng dropdown bằng cách click ra ngoài (simulate click outside)
    const body = document.querySelector('body');
    if (body) {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      body.dispatchEvent(clickEvent);
    }

    // Điều hướng đến route đích
    setTimeout(() => {
      this.router.navigate([route]);
    }, 50);
  }

  // Load recent projects
  loadRecentProjects(): void {
    this.projectService.getCurrentUserProjects().subscribe({
      next: (projects) => {
        // Sort by recently updated
        const sortedProjects = [...projects].sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0);
          const dateB = new Date(b.updatedAt || b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        // Map to display format
        this.recentProjects = sortedProjects.slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          key: p.key || (p.id ? p.id.substring(0, 4).toUpperCase() : 'PROJ'),
          type: p.description?.toLowerCase().includes('business')
            ? ('business' as const)
            : ('software' as const),
        }));
      },
      error: (err) => {
        console.error('Error loading recent projects', err);
        this.recentProjects = [];
      },
    });
  }
}
