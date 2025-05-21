import { Component, OnInit } from '@angular/core';
import { StatisticsService } from '../../../../core/services/statistics.service';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../../core/services/project.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';
import { SprintService } from '../../../../features/services/sprint.service';

@Component({
  selector: 'app-project-report',
  templateUrl: './project-report.component.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./project-report.component.scss']
})
export class ProjectReportComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  // Dữ liệu
  overview: any;
  taskStatus: any;
  userPerformance: any[] = [];
  sprintProgress: any[] = [];
  timeTracking: any;
  burndownChart: any;

  // Filter demo (có thể lấy từ service hoặc route thực tế)
  projectId = '';
  sprintId = '';
  userId = '';
  startDate = '';
  endDate = '';
  error: string | null = null;
  loading = false;

  constructor(
    private statisticsService: StatisticsService,
    private projectService: ProjectService,
    private sprintService: SprintService
  ) {}

  ngOnInit() {
    // Subscribe to changes in selected project
    this.projectService.selectedProject$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(project => {
        if (project && project.id) {
          this.projectId = project.id;
          // Lấy sprint đầu tiên (ưu tiên active) của project
          this.sprintService.getSprintsByProjectId(this.projectId).subscribe({
            next: (sprints) => {
              if (sprints && sprints.length > 0) {
                // Ưu tiên sprint đang active, nếu không có thì lấy sprint đầu tiên
                const activeSprint = sprints.find(s => s.status === 'active');
                this.sprintId = (activeSprint ? activeSprint.id : sprints[0].id) || '';
                this.loadAll();
              } else {
                this.error = 'Không có sprint nào cho project này!';
              }
            },
            error: (err) => {
              this.error = 'Không thể lấy danh sách sprint!';
              console.error(err);
            }
          });
        } else {
          this.error = 'No project selected. Please select a project from the sidebar.';
        }
      });
  }

  loadAll() {
    if (!this.projectId) {
      this.error = 'No project selected';
      return;
    }

    this.loading = true;
    this.error = null;

    this.statisticsService.getProjectOverview(this.projectId, this.startDate, this.endDate)
      .subscribe({
        next: (data: any) => this.overview = data,
        error: (err) => {
          console.error('Error loading project overview:', err);
          this.error = 'Failed to load project overview';
        }
      });

    this.statisticsService.getTaskStatus(this.projectId, this.startDate, this.endDate)
      .subscribe({
        next: (data: any) => this.taskStatus = data,
        error: (err) => {
          console.error('Error loading task status:', err);
          this.error = 'Failed to load task status';
        }
      });

    this.statisticsService.getUserPerformance(this.projectId, this.userId, this.startDate, this.endDate)
      .subscribe({
        next: (data: any) => {
          this.userPerformance = data;
          console.log('userPerformance', data);
        },
        error: (err) => {
          console.error('Error loading user performance:', err);
          this.error = 'Failed to load user performance';
        }
      });

    if (this.sprintId) {
      this.statisticsService.getSprintProgress(this.projectId, this.sprintId)
        .subscribe({
          next: (data: any) => {
            this.sprintProgress = data;
            console.log('sprintProgress', data);
          },
          error: (err) => {
            console.error('Error loading sprint progress:', err);
            this.error = 'Failed to load sprint progress';
          }
        });

      this.statisticsService.getBurndownChart(this.projectId, this.sprintId)
        .subscribe({
          next: (data: any) => {
            this.burndownChart = data;
            this.loading = false;
            console.log('burndownChart', data);
          },
          error: (err) => {
            console.error('Error loading burndown chart:', err);
            this.error = 'Failed to load burndown chart';
            this.loading = false;
          }
        });
    }

    this.statisticsService.getTimeTracking(this.projectId, this.startDate, this.endDate)
      .subscribe({
        next: (data: any) => {
          this.timeTracking = data;
          console.log('timeTracking', data);
        },
        error: (err) => {
          console.error('Error loading time tracking:', err);
          this.error = 'Failed to load time tracking';
        }
      });
  }
}
