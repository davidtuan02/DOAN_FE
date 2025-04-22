import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { finalize } from 'rxjs/operators';
import { DatePipe, NgIf, NgFor, NgClass } from '@angular/common';
import {
  ProjectService,
  Project,
} from '../../../../core/services/project.service';
import { ProjectMembersComponent } from '../project-members/project-members.component';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    NzMessageModule,
    NzModalModule,
    NzTabsModule,
    ProjectMembersComponent,
  ],
})
export class ProjectDetailComponent implements OnInit {
  projectId: string = '';
  project: Project | null = null;
  loading = false;
  error: string | null = null;
  deleteLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    if (this.projectId) {
      this.loadProject();
    } else {
      this.error = 'Project ID is missing';
    }
  }

  loadProject(): void {
    this.loading = true;
    this.projectService
      .getProjectById(this.projectId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (project) => {
          this.project = project;
          console.log('Project loaded successfully:', project);
        },
        error: (err) => {
          this.error = err.message || 'Failed to load project details';
          console.error('Error loading project:', err);
        },
      });
  }

  editProject(): void {
    this.router.navigate(['/projects', this.projectId, 'edit']);
  }

  confirmDelete(): void {
    this.modal.confirm({
      nzTitle: 'Are you sure you want to delete this project?',
      nzContent: 'This action cannot be undone.',
      nzOkText: 'Yes, Delete',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => this.deleteProject(),
      nzCancelText: 'Cancel',
    });
  }

  deleteProject(): void {
    this.deleteLoading = true;
    this.projectService
      .deleteProject(this.projectId)
      .pipe(finalize(() => (this.deleteLoading = false)))
      .subscribe({
        next: () => {
          this.message.success('Project deleted successfully');
          this.router.navigate(['/projects']);
        },
        error: (err) => {
          const errorMsg = err.message || 'Failed to delete project';
          this.message.error(errorMsg);
          console.error('Error deleting project:', err);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}
