import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, map, catchError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IssueService } from './issue.service';
import { UserService } from '../../core/services/user.service';
import { ProjectService } from '../../core/services/project.service';
import { SprintService, Sprint } from './sprint.service';
import { Issue } from './issue.service';

export interface ProjectStats {
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  todoIssues: number;
  reviewIssues: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  inProgressStoryPoints: number;
  todoStoryPoints: number;
  reviewStoryPoints: number;
  overdueIssues: number;
  highPriorityIssues: number;
  mediumPriorityIssues: number;
  lowPriorityIssues: number;
  bugCount: number;
  storyCount: number;
  taskCount: number;
}

export interface SprintProgress {
  id: string;
  name: string;
  goal?: string;
  status: string;
  startDate: Date;
  endDate: Date;
  totalStoryPoints: number;
  completedStoryPoints: number;
  progress: number;
  totalIssues: number;
  completedIssues: number;
}

export interface TeamMemberStats {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  assignedIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  reviewIssues: number;
  storyPoints: number;
  completedStoryPoints: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectStatsService {
  private apiUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private issueService: IssueService,
    private projectService: ProjectService,
    private sprintService: SprintService
  ) {}

  /**
   * Gets project statistics
   */
  getProjectStats(projectId: string): Observable<ProjectStats> {
    return this.issueService.getIssuesByProjectId(projectId).pipe(
      map((issues) => this.calculateProjectStats(issues)),
      catchError((error) => {
        console.error('Error fetching project stats', error);
        return of({
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
        });
      })
    );
  }

  /**
   * Calculate project statistics from issues
   */
  private calculateProjectStats(issues: Issue[]): ProjectStats {
    const stats: ProjectStats = {
      totalIssues: issues.length,
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

    const now = new Date();

    issues.forEach((issue) => {
      // Count by status
      if (issue.status === 'Done') {
        stats.completedIssues++;
        stats.completedStoryPoints += issue.storyPoints || 0;
      } else if (issue.status === 'In Progress') {
        stats.inProgressIssues++;
        stats.inProgressStoryPoints += issue.storyPoints || 0;
      } else if (issue.status === 'To Do') {
        stats.todoIssues++;
        stats.todoStoryPoints += issue.storyPoints || 0;
      } else if (issue.status === 'Review') {
        stats.reviewIssues++;
        stats.reviewStoryPoints += issue.storyPoints || 0;
      }

      // Calculate total story points
      stats.totalStoryPoints += issue.storyPoints || 0;

      // Count overdue issues
      if (
        issue.dueDate &&
        new Date(issue.dueDate) < now &&
        issue.status !== 'Done'
      ) {
        stats.overdueIssues++;
      }

      // Count by priority
      if (issue.priority === 'High' || issue.priority === 'Highest') {
        stats.highPriorityIssues++;
      } else if (issue.priority === 'Medium') {
        stats.mediumPriorityIssues++;
      } else if (issue.priority === 'Low' || issue.priority === 'Lowest') {
        stats.lowPriorityIssues++;
      }

      // Count by issue type
      if (issue.type === 'Bug') {
        stats.bugCount++;
      } else if (issue.type === 'Story') {
        stats.storyCount++;
      } else if (issue.type === 'Task') {
        stats.taskCount++;
      }
    });

    return stats;
  }

  /**
   * Gets current sprint progress
   */
  getCurrentSprint(projectId: string): Observable<SprintProgress | null> {
    return this.sprintService.getSprintsByProjectId(projectId).pipe(
      map((sprints) => {
        // Find the active sprint
        const activeSprint = sprints.find(
          (sprint) => sprint.status === 'active'
        );

        if (!activeSprint) {
          return null;
        }

        // Calculate sprint statistics
        let totalStoryPoints = 0;
        let completedStoryPoints = 0;
        let totalIssues = 0;
        let completedIssues = 0;

        if (activeSprint.issues && activeSprint.issues.length > 0) {
          totalIssues = activeSprint.issues.length;

          activeSprint.issues.forEach((issue) => {
            totalStoryPoints += issue.storyPoints || 0;

            if (issue.status === 'Done') {
              completedIssues++;
              completedStoryPoints += issue.storyPoints || 0;
            }
          });
        }

        const progress =
          totalStoryPoints > 0
            ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
            : 0;

        return {
          id: activeSprint.id!,
          name: activeSprint.name,
          goal: activeSprint.goal,
          status: activeSprint.status,
          startDate: activeSprint.startDate
            ? new Date(activeSprint.startDate)
            : new Date(),
          endDate: activeSprint.endDate
            ? new Date(activeSprint.endDate)
            : new Date(),
          totalStoryPoints,
          completedStoryPoints,
          progress,
          totalIssues,
          completedIssues,
        };
      }),
      catchError((error) => {
        console.error('Error fetching current sprint:', error);
        return of(null);
      })
    );
  }

  /**
   * Gets team member performance
   */
  getTeamPerformance(projectId: string): Observable<TeamMemberStats[]> {
    return forkJoin([
      this.projectService.getProjectMembers(projectId),
      this.issueService.getIssuesByProjectId(projectId),
    ]).pipe(
      map(([members, issues]) => {
        // Create a map to track metrics for each team member
        const memberStats = new Map<string, TeamMemberStats>();

        // Initialize stats for each team member
        members.forEach((member) => {
          memberStats.set(member.id, {
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
            avatar: member.avatar,
            role: member.role || 'Team Member',
            assignedIssues: 0,
            completedIssues: 0,
            inProgressIssues: 0,
            reviewIssues: 0,
            storyPoints: 0,
            completedStoryPoints: 0,
          });
        });

        // Process issues to calculate member stats
        issues.forEach((issue) => {
          if (issue.assignee && memberStats.has(issue.assignee.id)) {
            const stats = memberStats.get(issue.assignee.id)!;
            stats.assignedIssues++;
            stats.storyPoints += issue.storyPoints || 0;

            if (issue.status === 'Done') {
              stats.completedIssues++;
              stats.completedStoryPoints += issue.storyPoints || 0;
            } else if (issue.status === 'In Progress') {
              stats.inProgressIssues++;
            } else if (issue.status === 'Review') {
              stats.reviewIssues++;
            }
          }
        });

        // Convert map to array and sort by assignedIssues
        return Array.from(memberStats.values())
          .filter((member) => member.assignedIssues > 0)
          .sort((a, b) => b.assignedIssues - a.assignedIssues);
      }),
      catchError((error) => {
        console.error('Error fetching team performance', error);
        return of([]);
      })
    );
  }
}
