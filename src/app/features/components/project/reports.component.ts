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
    <div class="container-fluid p-4">
      <div class="card">
        <div class="card-header">
          <h5 class="card-title mb-0">Sprint Performance Report</h5>
        </div>
        <div class="card-body">
          <div *ngIf="sprints.length === 0" class="alert alert-info">No sprints found in this project.</div>
          
          <!-- Charts Section -->
          <div *ngIf="sprints.length > 0" class="row mb-4">
            <!-- Story Points Chart -->
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <h6 class="card-subtitle mb-3">Story Points by Sprint</h6>
                  <canvas #storyPointsChart></canvas>
                </div>
              </div>
            </div>
            
            <!-- Issue Types Chart -->
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <h6 class="card-subtitle mb-3">Issue Type Distribution</h6>
                  <canvas #issueTypesChart></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Table Section -->
          <div *ngIf="sprints.length > 0" class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Sprint</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Story Points</th>
                  <th>Bug Count</th>
                  <th>Total Issues</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let sprint of sprints">
                  <td>{{ sprint.name }}</td>
                  <td>{{ sprint.startDate | date:'shortDate' }}</td>
                  <td>{{ sprint.endDate | date:'shortDate' }}</td>
                  <td>{{ getCompletedStoryPoints(sprint) }}/{{ getTotalStoryPoints(sprint) }}</td>
                  <td>{{ getBugCount(sprint) }}</td>
                  <td>{{ sprint.issues?.length || 0 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
      margin-bottom: 1rem;
    }
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid rgba(0,0,0,.125);
    }
    .card-title {
      font-size: 0.9rem;
      font-weight: 500;
    }
    .card-subtitle {
      font-size: 0.8rem;
      color: #6c757d;
    }
    .table th {
      font-weight: 500;
      background-color: #f8f9fa;
      font-size: 0.8rem;
    }
    .table td {
      font-size: 0.8rem;
    }
    .alert {
      margin-bottom: 1rem;
      font-size: 0.8rem;
    }
  `]
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
            label: 'Story Points completed',
            data: this.sprints.map(s => this.getCompletedStoryPoints(s)),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Total Story Points',
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
            text: 'Story Points by Sprint'
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
            text: 'Issue Type Distribution'
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