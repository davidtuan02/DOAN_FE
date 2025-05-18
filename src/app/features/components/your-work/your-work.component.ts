import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { IssueService } from '../../services/issue.service';
import { UserService } from '../../../core/services/user.service';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable, finalize, of } from 'rxjs';
import { SvgIconComponent } from '../../../shared/components';

// Our internal project model
interface Project {
  id: string;
  name: string;
  key: string;
  type: string;
  description?: string;
  avatarUrl?: string;
  issueCount?: {
    open: number;
    done: number;
  };
}

interface Task {
  id: string;
  key: string;
  title: string;
  summary: string;
  status: string;
  priority: string;
  projectId: string;
  projectName: string;
  projectKey: string;
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  created: Date;
}

@Component({
  selector: 'app-your-work',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTabsModule, SvgIconComponent],
  templateUrl: './your-work.component.html',
  styleUrls: ['./your-work.component.scss'],
})
export class YourWorkComponent implements OnInit {
  recentProjects: Project[] = [];
  workedOnTasks: Task[] = [];
  viewedTasks: Task[] = [];
  assignedTasks: Task[] = [];
  starredTasks: Task[] = [];

  isLoading = true;
  activeTab = 0;
  error: string | null = null;

  constructor(
    private projectService: ProjectService,
    private issueService: IssueService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecentProjects();
    this.loadAssignedTasks();
  }

  /**
   * Handles navigation to board view for the selected project
   */
  goToBoard(project: Project): void {
    // Convert local Project model to service's Project model
    const serviceProject = {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description || '',  // Convert undefined to empty string
      type: project.type,
      // Include any other necessary fields
    };

    // Set the selected project in the project service
    this.projectService.setSelectedProject(serviceProject);

    // Navigate to the board page
    this.router.navigate(['/board']);
  }

  loadRecentProjects(): void {
    this.projectService
      .getCurrentUserProjects()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (projects: any[]) => {
          // Safely map project data to our Project interface
          this.recentProjects = projects
            .filter((project) => project && project.id)
            .slice(0, 4)
            .map((project) => ({
              id: project.id,
              name: project.name || 'Unnamed Project',
              key: project.key || project.id.substring(0, 4).toUpperCase(),
              type: project.category || 'software',
              description: project.description,
              avatarUrl: project.avatarUrl,
              issueCount: {
                open: project.openTasksCount || 0,
                done: project.closedTasksCount || 0,
              },
            }));

          // After projects are loaded, fetch issues for each project
          this.loadWorkedOnTasks();
          this.loadViewedTasks();
        },
        error: (err) => {
          console.error('Error loading projects:', err);
          this.error = 'Failed to load recent projects';
        },
      });
  }

  loadWorkedOnTasks(): void {
    // In a real app, this would be a dedicated API call
    // For now we'll simulate with issues from all projects
    const projectIds = this.recentProjects.map((p) => p.id);
    if (projectIds.length === 0) {
      this.workedOnTasks = [];
      return;
    }

    this.issueService.getIssuesByProjectId(projectIds[0]).subscribe({
      next: (issues) => {
        // Get the most recently updated issues
        this.workedOnTasks = issues
          .slice(0, 5)
          .map((issue) => this.mapIssueToTask(issue));
      },
      error: (err) => {
        console.error('Error loading worked on tasks:', err);
      },
    });
  }

  loadViewedTasks(): void {
    // In a real app, this would track recently viewed issues
    // For now we'll simulate with a subset of issues
    const projectIds = this.recentProjects.map((p) => p.id);
    if (projectIds.length <= 1) {
      this.viewedTasks = [];
      return;
    }

    this.issueService.getIssuesByProjectId(projectIds[1]).subscribe({
      next: (issues) => {
        this.viewedTasks = issues
          .slice(0, 3)
          .map((issue) => this.mapIssueToTask(issue));
      },
      error: (err) => {
        console.error('Error loading viewed tasks:', err);
      },
    });
  }

  loadAssignedTasks(): void {
    // Get current user
    this.userService.getCurrentUser().subscribe((user) => {
      if (!user || !user.id) {
        this.assignedTasks = [];
        return;
      }

      // In a real app, this would be a dedicated API call to get all issues assigned to the user
      // For now we'll get issues from first project and filter by assignee
      this.projectService.getCurrentUserProjects().subscribe((projects) => {
        if (projects.length === 0 || !projects[0].id) {
          this.assignedTasks = [];
          return;
        }

        this.issueService
          .getIssuesByProjectId(projects[0].id)
          .subscribe((issues) => {
            this.assignedTasks = issues
              .filter(
                (issue) => issue.assignee && issue.assignee.id === user.id
              )
              .map((issue) => this.mapIssueToTask(issue));
          });
      });
    });
  }

  private mapIssueToTask(issue: any): Task {
    const projectId = issue.projectId || '';

    return {
      id: issue.id || '',
      key: issue.key || `TASK-${issue.id ? issue.id.substring(0, 2) : '00'}`,
      title: issue.title || issue.summary || 'Untitled Task',
      summary: issue.description || 'No description',
      status: issue.status || 'To Do',
      priority: issue.priority || 'Medium',
      projectId: projectId,
      projectName: this.getProjectName(projectId),
      projectKey: this.getProjectKey(projectId),
      assignee: issue.assignee,
      created: new Date(issue.createdAt || Date.now()),
    };
  }

  private getProjectName(projectId: string): string {
    const project = this.recentProjects.find((p) => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  }

  private getProjectKey(projectId: string): string {
    const project = this.recentProjects.find((p) => p.id === projectId);
    return project ? project.key : 'PROJ';
  }

  setActiveTab(index: number): void {
    this.activeTab = index;
  }

  viewAllProjects(): void {
    // Navigate to projects page
  }

  navigateToProject(projectId: string): void {
    // Navigate to project details
  }

  navigateToTask(taskId: string): void {
    // Navigate to task details
  }
}
