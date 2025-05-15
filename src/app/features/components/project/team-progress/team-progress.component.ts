import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ProjectStatsService,
  TeamMemberStats,
} from '../../../services/project-stats.service';
import { ProjectService } from '../../../../core/services/project.service';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SvgIconComponent } from '../../../../shared/components';

@Component({
  selector: 'app-team-progress',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SvgIconComponent,
  ],
  template: `
    <div class="container mx-auto px-4 py-6">
      <!-- Loading indicator -->
      <div
        *ngIf="isLoading"
        class="flex items-center justify-center py-12"
      >
        <mat-spinner [diameter]="40"></mat-spinner>
      </div>

      <!-- Error message -->
      <div
        *ngIf="error"
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
      >
        {{ error }}
      </div>

      <!-- Content when loaded -->
      <div *ngIf="!isLoading && !error">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Team Progress</h1>
          <p class="text-gray-600">
            Track progress and performance of team members in {{ currentProjectName }}
          </p>
        </div>

        <!-- Team members progress -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-lg font-medium text-gray-800">Member Progress</h2>
          </div>

          <div *ngIf="teamMembers.length === 0" class="p-8 text-center text-gray-500">
            No team members data available
          </div>

          <div *ngIf="teamMembers.length > 0" class="divide-y divide-gray-200">
            <div *ngFor="let member of teamMembers" class="p-4 hover:bg-gray-50">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-10 h-10 overflow-hidden rounded-full">
                  <img
                    *ngIf="member.avatar"
                    [src]="member.avatar"
                    alt="{{ member.name }}"
                    class="object-cover w-full h-full"
                  />
                  <div
                    *ngIf="!member.avatar"
                    class="flex items-center justify-center w-full h-full font-medium text-white bg-purple-600"
                  >
                    {{ getInitials(member.name) }}
                  </div>
                </div>

                <div class="ml-4 flex-grow">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium">{{ member.name }}</span>
                    <span class="text-xs font-medium text-gray-500">
                      {{ member.completedIssues }}/{{ member.assignedIssues }}
                      issues completed
                    </span>
                  </div>

                  <div class="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      class="h-full rounded-full"
                      [ngClass]="{
                        'bg-green-500': getCompletionRate(member.assignedIssues, member.completedIssues) > 75,
                        'bg-yellow-500': getCompletionRate(member.assignedIssues, member.completedIssues) > 25 && getCompletionRate(member.assignedIssues, member.completedIssues) <= 75,
                        'bg-blue-500': getCompletionRate(member.assignedIssues, member.completedIssues) <= 25
                      }"
                      [style.width.%]="getCompletionRate(member.assignedIssues, member.completedIssues)"
                    ></div>
                  </div>

                  <div class="grid grid-cols-3 gap-4 mt-3">
                    <div class="text-center p-2 bg-gray-50 rounded border border-gray-100">
                      <div class="text-xs text-gray-500">Assigned</div>
                      <div class="font-medium">{{ member.assignedIssues }}</div>
                    </div>
                    <div class="text-center p-2 bg-gray-50 rounded border border-gray-100">
                      <div class="text-xs text-gray-500">Completed</div>
                      <div class="font-medium">{{ member.completedIssues }}</div>
                    </div>
                    <div class="text-center p-2 bg-gray-50 rounded border border-gray-100">
                      <div class="text-xs text-gray-500">Story Points</div>
                      <div class="font-medium">{{ member.storyPoints }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TeamProgressComponent implements OnInit {
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
    this.loadCurrentProject();
  }

  loadCurrentProject(): void {
    this.isLoading = true;
    this.projectService.selectedProject$.subscribe({
      next: (project) => {
        if (project && project.id && project.name) {
          this.currentProjectId = project.id;
          this.currentProjectName = project.name;
          this.loadTeamData();
        } else {
          this.error = 'No project selected';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading project:', err);
        this.error = 'Failed to load project data';
        this.isLoading = false;
      },
    });
  }

  loadTeamData(): void {
    this.projectStatsService
      .getTeamPerformance(this.currentProjectId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (members) => {
          this.teamMembers = members.sort((a, b) =>
            (b.completedIssues / (b.assignedIssues || 1)) -
            (a.completedIssues / (a.assignedIssues || 1))
          );
          console.log('Team data loaded:', members.length, 'members');
        },
        error: (err) => {
          console.error('Error loading team data:', err);
          this.error = 'Failed to load team member data';
        },
      });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getCompletionRate(total: number, completed: number): number {
    if (!total) return 0;
    return Math.round((completed / total) * 100);
  }
}
