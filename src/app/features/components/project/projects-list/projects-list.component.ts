import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  ProjectService,
  Project,
} from '../../../../core/services/project.service';
import { UserService } from '../../../../core/services/user.service';
import {
  SvgIconComponent,
  AvatarComponent,
} from '../../../../shared/components';
import { finalize } from 'rxjs/operators';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

// Interface extending Project with display-specific properties
interface ProjectDisplay extends Project {
  favorite: boolean;
  lead?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  url: string;
  type: 'business' | 'software';
}

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SvgIconComponent,
    AvatarComponent,
    NzTableModule,
    NzDropDownModule,
    NzButtonModule,
    NzInputModule,
    NzToolTipModule,
    NzIconModule,
    NzPaginationModule,
  ],
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss'],
})
export class ProjectsListComponent implements OnInit {
  projects: ProjectDisplay[] = [];
  filteredProjects: ProjectDisplay[] = [];
  isLoading = true;
  error: string | null = null;
  filterValue = 'all';
  searchQuery = '';
  favorites: Record<string, boolean> = {};

  // Pagination
  pageSize = 10;
  currentPage = 1;
  totalProjects = 0;

  constructor(
    private projectService: ProjectService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadFavorites();
  }

  loadProjects(): void {
    this.isLoading = true;
    this.error = null;

    this.projectService.getCurrentUserProjects().subscribe({
      next: (projects) => {
        // Transform projects to display format
        this.projects = this.mapProjectsToDisplayFormat(projects);
        this.totalProjects = this.projects.length;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load projects';
        this.isLoading = false;
      },
    });
  }

  loadFavorites(): void {
    // In a real app, you would fetch favorites from an API or local storage
    // Here we're simulating it with localStorage
    const savedFavorites = localStorage.getItem('favoriteProjects');
    if (savedFavorites) {
      try {
        this.favorites = JSON.parse(savedFavorites);
      } catch (e) {
        console.error('Error parsing favorites', e);
        this.favorites = {};
      }
    }
  }

  private mapProjectsToDisplayFormat(projects: Project[]): ProjectDisplay[] {
    return projects.map((p) => {
      // Find lead user from usersIncludes if available
      let lead = undefined;
      if (p.usersIncludes && p.usersIncludes.length > 0) {
        const user = p.usersIncludes[0];
        lead = {
          id: user.id || '',
          name: user.name || user.username || 'Project Lead',
          avatarUrl: user.avatarUrl,
        };
      }

      // Generate a key if not provided
      const key = p.key || (p.id ? p.id.substring(0, 4).toUpperCase() : 'PROJ');

      // Determine project type based on description
      const type = p.description?.toLowerCase().includes('business')
        ? ('business' as const)
        : ('software' as const);

      return {
        ...p,
        key,
        favorite: this.favorites[p.id || ''] || false,
        lead,
        url: p.id ? `/projects/${p.id}` : '',
        type,
      };
    });
  }

  applyFilters(): void {
    let filtered = [...this.projects];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.key && p.key.toLowerCase().includes(query)) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (this.filterValue !== 'all') {
      filtered = filtered.filter((p) => p.type === this.filterValue);
    }

    this.filteredProjects = filtered;
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(value: string): void {
    this.filterValue = value;
    this.applyFilters();
  }

  toggleFavorite(project: ProjectDisplay, event: Event): void {
    event.stopPropagation(); // Prevent navigation when clicking the star

    if (!project.id) return;

    // Toggle favorite status
    project.favorite = !project.favorite;
    this.favorites[project.id] = project.favorite;

    // Save to localStorage
    localStorage.setItem('favoriteProjects', JSON.stringify(this.favorites));
  }

  navigateToProject(project: ProjectDisplay): void {
    if (project.id) {
      this.router.navigate(['/projects', project.id]);
    }
  }

  createProject(): void {
    this.router.navigate(['/projects/new']);
  }

  showProjectActions(event: Event, project: ProjectDisplay): void {
    event.stopPropagation(); // Prevent navigation when clicking the menu
    // Implement dropdown menu for project actions
    // This would typically toggle a dropdown with edit, delete options
    console.log('Show actions for project', project.name);
  }

  trackByProjectId(index: number, project: ProjectDisplay): string {
    return project.id || String(index);
  }
}
