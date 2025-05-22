import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { tap } from 'rxjs/operators';
import { Destroyable, takeUntilDestroyed } from '../../../shared/utils';
import { SidebarResizerComponent } from '../sidebar-resizer/sidebar-resizer.component';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from '../../../shared/components';
import { Router, RouterModule } from '@angular/router';
import {
  ProjectService,
  Project,
} from '../../../core/services/project.service';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PermissionService } from '../../../core/services/permission.service';

@Destroyable()
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    SidebarResizerComponent,
    SvgIconComponent,
    RouterModule,
    NzDropDownModule,
    NzSkeletonModule,
    FormsModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  isAdmin = false;

  navItems = [
    {
      label: 'Backlog',
      icon: 'roadmap',
      link: '/backlog',
    },
    {
      label: 'Board',
      icon: 'board',
      link: '/board',
    },
    // {
    //   label: 'Goals',
    //   icon: 'target',
    //   link: '/goals',
    // },
    {
      label: 'Issues',
      icon: 'bug',
      link: '/issues',
    },
    {
      label: 'Summary',
      icon: 'summary',
      link: '/summary',
    },
    // {
    //   label: 'Báo cáo',
    //   icon: 'summary',
    //   link: '/reports',
    // },
    {
      label: 'Reports',
      icon: 'form',
      link: '/forms',
      adminOnly: true
    },
    {
      label: 'Settings',
      icon: 'settings',
      link: '/project-settings',
    },
  ];

  collapsed = false;
  projects: Project[] = [];
  loading = false;
  selectedProject: Project | null = null;
  showProjectSelector = false;
  searchTerm = '';
  filteredProjects: Project[] = [];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private projectService: ProjectService,
    private router: Router,
    private message: NzMessageService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 959.98px)'])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((state) => {
          this.collapsed = state.matches;
        })
      )
      .subscribe();

    this.loadUserProjects();
    this.loadUserPermissions();

    // Subscribe to selected project changes
    this.projectService.selectedProject$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((project) => {
        this.selectedProject = project;
      });
  }

  loadUserProjects(): void {
    this.loading = true;
    this.projectService
      .getCurrentUserProjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.filteredProjects = [...projects];

          // If there's no selected project yet but we have projects, select the first one
          if (
            projects.length > 0 &&
            !this.projectService.getSelectedProject()
          ) {
            this.selectProject(projects[0]);
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load projects', error);
          this.loading = false;
        },
      });
  }

  loadUserPermissions(): void {
    this.permissionService.isAdmin().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
  }

  selectProject(project: Project): void {
    this.projectService.setSelectedProject(project);
    this.showProjectSelector = false;
  }

  toggleProjectSelector(): void {
    this.showProjectSelector = !this.showProjectSelector;
  }

  filterProjects(): void {
    if (!this.searchTerm.trim()) {
      this.filteredProjects = [...this.projects];
      return;
    }

    const search = this.searchTerm.toLowerCase().trim();
    this.filteredProjects = this.projects.filter(
      (project) =>
        project.name.toLowerCase().includes(search) ||
        (project.description &&
          project.description.toLowerCase().includes(search))
    );
  }

  onToggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

  createNewProject(event: Event): void {
    event.preventDefault();
    this.showProjectSelector = false;
    this.router.navigate(['/projects/new']);
  }
}
