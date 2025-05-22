import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SprintService, Sprint } from '../../services/sprint.service';
import { ProjectService, Project } from '../../../core/services/project.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-6">
      <h1 class="text-2xl font-bold mb-6">Báo cáo Sprint Performance</h1>
      <div *ngIf="sprints.length === 0" class="text-gray-500">Không có sprint nào trong dự án này.</div>
      
      <!-- Charts Section -->
      <div *ngIf="sprints.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Story Points Chart -->
        <div class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-semibold mb-4">Story Points theo Sprint</h2>
          <canvas #storyPointsChart></canvas>
        </div>
        
        <!-- Issue Types Chart -->
        <div class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-semibold mb-4">Phân bố loại Issue</h2>
          <canvas #issueTypesChart></canvas>
        </div>
      </div>

      <!-- Table Section -->
      <table *ngIf="sprints.length > 0" class="min-w-full bg-white border rounded">
        <thead>
          <tr>
            <th class="px-4 py-2 border">Sprint</th>
            <th class="px-4 py-2 border">Ngày bắt đầu</th>
            <th class="px-4 py-2 border">Ngày kết thúc</th>
            <th class="px-4 py-2 border">Story Points (hoàn thành/tổng)</th>
            <th class="px-4 py-2 border">Số lượng Bug</th>
            <th class="px-4 py-2 border">Tổng số Issue</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let sprint of sprints">
            <td class="px-4 py-2 border">{{ sprint.name }}</td>
            <td class="px-4 py-2 border">{{ sprint.startDate | date:'shortDate' }}</td>
            <td class="px-4 py-2 border">{{ sprint.endDate | date:'shortDate' }}</td>
            <td class="px-4 py-2 border">{{ getCompletedStoryPoints(sprint) }}/{{ getTotalStoryPoints(sprint) }}</td>
            <td class="px-4 py-2 border">{{ getBugCount(sprint) }}</td>
            <td class="px-4 py-2 border">{{ sprint.issues?.length || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('storyPointsChart') storyPointsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('issueTypesChart') issueTypesChartRef!: ElementRef<HTMLCanvasElement>;
  
  sprints: Sprint[] = [];
  private storyPointsChart: Chart | null = null;
  private issueTypesChart: Chart | null = null;

  constructor(
    private sprintService: SprintService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    const project = this.projectService.getSelectedProject() as Project;
    if (project && project.id) {
      this.sprintService.getSprintsByProjectId(project.id).subscribe((sprints: Sprint[]) => {
        this.sprints = sprints;
        if (this.sprints.length === 0) {
          this.addSampleData();
        }
      });
    } else {
      this.addSampleData();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
    }, 300);
  }
  
  private addSampleData(): void {
    this.sprints = [
      {
        id: '1',
        name: 'Sprint 1',
        status: 'completed',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-14'),
        issues: [
          { id: '101', title: 'Task 1', status: 'Done', storyPoints: 3, type: 'Task' },
          { id: '102', title: 'Bug 1', status: 'Done', storyPoints: 2, type: 'Bug' },
          { id: '103', title: 'Story 1', status: 'In Progress', storyPoints: 5, type: 'Story' }
        ]
      },
      {
        id: '2',
        name: 'Sprint 2',
        status: 'completed',
        startDate: new Date('2023-01-15'),
        endDate: new Date('2023-01-28'),
        issues: [
          { id: '201', title: 'Task 2', status: 'Done', storyPoints: 4, type: 'Task' },
          { id: '202', title: 'Bug 2', status: 'In Progress', storyPoints: 1, type: 'Bug' },
          { id: '203', title: 'Story 2', status: 'Done', storyPoints: 8, type: 'Story' },
          { id: '204', title: 'Bug 3', status: 'Done', storyPoints: 2, type: 'Bug' }
        ]
      },
      {
        id: '3',
        name: 'Sprint 3',
        status: 'active',
        startDate: new Date('2023-02-01'),
        endDate: new Date('2023-02-14'),
        issues: [
          { id: '301', title: 'Task 3', status: 'Done', storyPoints: 6, type: 'Task' },
          { id: '302', title: 'Story 3', status: 'Done', storyPoints: 10, type: 'Story' },
          { id: '303', title: 'Bug 4', status: 'In Progress', storyPoints: 3, type: 'Bug' }
        ]
      }
    ];
  }

  private initCharts(): void {
    if (this.storyPointsChart) {
      this.storyPointsChart.destroy();
    }
    if (this.issueTypesChart) {
      this.issueTypesChart.destroy();
    }
    if (!this.storyPointsChartRef || !this.issueTypesChartRef) {
      return;
    }
    const storyPointsCtx = this.storyPointsChartRef.nativeElement.getContext('2d');
    const issueTypesCtx = this.issueTypesChartRef.nativeElement.getContext('2d');
    if (!storyPointsCtx || !issueTypesCtx) {
      return;
    }
    this.storyPointsChart = new Chart(storyPointsCtx, {
      type: 'bar',
      data: {
        labels: this.sprints.map(s => s.name),
        datasets: [
          {
            label: 'Story Points hoàn thành',
            data: this.sprints.map(s => this.getCompletedStoryPoints(s)),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Tổng Story Points',
            data: this.sprints.map(s => this.getTotalStoryPoints(s)),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Story Points theo Sprint'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Story Points'
            }
          }
        }
      }
    });
    const issueTypes = this.getIssueTypesDistribution();
    this.issueTypesChart = new Chart(issueTypesCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(issueTypes),
        datasets: [{
          data: Object.values(issueTypes),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Phân bố loại Issue'
          }
        }
      }
    });
  }

  private getIssueTypesDistribution(): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    this.sprints.forEach(sprint => {
      if (sprint.issues) {
        sprint.issues.forEach(issue => {
          const type = issue.type || 'Unknown';
          distribution[type] = (distribution[type] || 0) + 1;
        });
      }
    });
    return distribution;
  }

  getCompletedStoryPoints(sprint: Sprint): number {
    if (!sprint.issues) return 0;
    return sprint.issues.filter((i: any) => i.status === 'Done').reduce((sum: number, i: any) => sum + (i.storyPoints || 0), 0);
  }

  getTotalStoryPoints(sprint: Sprint): number {
    if (!sprint.issues) return 0;
    return sprint.issues.reduce((sum: number, i: any) => sum + (i.storyPoints || 0), 0);
  }

  getBugCount(sprint: Sprint): number {
    if (!sprint.issues) return 0;
    return sprint.issues.filter((i: any) => i.type === 'Bug').length;
  }
} 