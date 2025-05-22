import { Component, OnInit } from '@angular/core';
import { StatisticsService } from '../../../../core/services/statistics.service';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../../core/services/project.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';
import { SprintService } from '../../../../features/services/sprint.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { BASE_URL } from '../../../../core/constants';

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
  exportLoading = false;

  constructor(
    private statisticsService: StatisticsService,
    private projectService: ProjectService,
    private sprintService: SprintService,
    private http: HttpClient
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

  exportReport(format: string) {
    if (!this.projectId) {
      this.error = 'No project selected';
      return;
    }

    this.exportLoading = true;
    let url = `${BASE_URL}/statistics/project-report`;

    // Add query parameters
    let params = new HttpParams().set('projectId', this.projectId);
    if (this.startDate) params = params.set('startDate', this.startDate);
    if (this.endDate) params = params.set('endDate', this.endDate);

    if (format === 'pdf') {
      url += '/base64';
      this.http.get(url, { params }).subscribe({
        next: (response: any) => {
          // Nếu response.data là chuỗi base64 có prefix, cần loại bỏ:
          const base64Data = response.data.split(',').pop(); // an toàn trong mọi trường hợp

          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });

          const blobUrl = window.URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = 'Report.pdf';
          document.body.appendChild(link); // Bắt buộc với một số trình duyệt
          link.click();
          document.body.removeChild(link);

          window.URL.revokeObjectURL(blobUrl); // Giải phóng bộ nhớ
          this.exportLoading = false;

        },
        error: (err) => {
          console.error('Lỗi tải file:', err);
          this.exportLoading = false;

        }
      });
    } else {
      // For JSON format
      this.http.get(url, {
        params,
        responseType: 'blob',
        observe: 'response'
      }).subscribe({
        next: (response) => {
          if (response.body) {
            const blob = new Blob([response.body], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition
            contentDisposition ? contentDisposition.split('filename=')[1].replace(/"/g, '') : `project-report-${this.projectId}.json`;

            link.download = filename || 'Report.json';
            link.click();
           window.URL.revokeObjectURL(url);
          }
          this.exportLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to export report';
          this.exportLoading = false;
        }
      });
    }
  }
}
