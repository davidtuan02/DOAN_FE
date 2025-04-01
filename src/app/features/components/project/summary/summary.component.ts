import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ProjectStatsService,
  ProjectStats,
  SprintProgress,
  TeamMemberStats,
} from '../../../services/project-stats.service';
import { ProjectService } from '../../../../core/services/project.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SvgIconComponent } from '../../../../shared/components';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SvgIconComponent,
  ],
  templateUrl: './summary.component.html',
})
export class SummaryComponent implements OnInit {
  projectStats: ProjectStats = {
    totalIssues: 0,
    completedIssues: 0,
    inProgressIssues: 0,
    todoIssues: 0,
    reviewIssues: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
    inProgressStoryPoints: 0,
    todoStoryPoints: 0,
    reviewStoryPoints: 0,
    overdueIssues: 0,
    highPriorityIssues: 0,
    mediumPriorityIssues: 0,
    lowPriorityIssues: 0,
    bugCount: 0,
    storyCount: 0,
    taskCount: 0,
  };

  currentSprint: SprintProgress | null = null;
  teamMembers: TeamMemberStats[] = [];
  currentProjectId: string = '';
  currentProjectName: string = '';
  isLoading = true;
  error: string | null = null;

  constructor(
    private projectStatsService: ProjectStatsService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Get selected project from ProjectService
    const selectedProject = this.projectService.getSelectedProject();
    if (selectedProject && selectedProject.id) {
      this.currentProjectId = selectedProject.id;
      this.currentProjectName = selectedProject.name;
      this.loadProjectData();
    } else {
      this.error = 'No project selected. Please select a project first.';
      this.isLoading = false;
    }
  }

  loadProjectData(): void {
    this.isLoading = true;
    this.error = null;

    // Load project stats
    this.projectStatsService
      .getProjectStats(this.currentProjectId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (stats) => {
          this.projectStats = stats;
          console.log('Project stats loaded:', stats);
          // Once stats are loaded, load additional data
          this.loadSprintData();
          this.loadTeamData();
        },
        error: (err) => {
          console.error('Error loading project stats:', err);
          this.error = 'Failed to load project statistics. Please try again.';
          this.snackBar.open('Error loading project data', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  loadSprintData(): void {
    this.projectStatsService.getCurrentSprint(this.currentProjectId).subscribe({
      next: (sprint) => {
        this.currentSprint = sprint;
        console.log('Current sprint data loaded:', sprint);
      },
      error: (err) => {
        console.error('Error loading sprint data:', err);
        // Don't show error for sprint, non-critical
      },
    });
  }

  loadTeamData(): void {
    this.projectStatsService
      .getTeamPerformance(this.currentProjectId)
      .subscribe({
        next: (members) => {
          this.teamMembers = members;
          console.log('Team data loaded:', members.length, 'members');
        },
        error: (err) => {
          console.error('Error loading team data:', err);
          // Don't show error for team data, non-critical
        },
      });
  }

  // Helper method to calculate completion percentage
  getCompletionPercentage(): number {
    if (!this.projectStats.totalIssues) return 0;
    return Math.round(
      (this.projectStats.completedIssues / this.projectStats.totalIssues) * 100
    );
  }

  // Helper method to calculate story points completion percentage
  getStoryPointsCompletionPercentage(): number {
    if (!this.projectStats.totalStoryPoints) return 0;
    return Math.round(
      (this.projectStats.completedStoryPoints /
        this.projectStats.totalStoryPoints) *
        100
    );
  }

  // Helper method to get priority color class
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'High':
      case 'Highest':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
      case 'Lowest':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Helper method for team performance stats
  getCompletionRate(assignedIssues: number, completedIssues: number): number {
    if (!assignedIssues) return 0;
    return Math.round((completedIssues / assignedIssues) * 100);
  }

  // Safely extract initials from name
  getInitials(name?: string): string {
    if (!name) return '?';

    const parts = name.split(' ').filter((part) => part.length > 0);
    if (parts.length === 0) return '?';

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Refresh data
  refreshData(): void {
    this.loadProjectData();
  }
}
