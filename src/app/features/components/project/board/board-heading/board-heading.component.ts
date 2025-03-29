import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { SvgIconComponent } from '../../../../../shared/components';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../../../core/services/project.service';
import {
  SprintService,
  Sprint,
} from '../../../../../features/services/sprint.service';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { FormsModule } from '@angular/forms';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';

@Destroyable()
@Component({
  selector: 'app-board-heading',
  standalone: true,
  imports: [
    CommonModule,
    NzBreadCrumbModule,
    NzPopoverModule,
    SvgIconComponent,
    NzDropDownModule,
    NzButtonModule,
    NzModalModule,
    FormsModule,
  ],
  providers: [NzModalService, NzMessageService],
  templateUrl: './board-heading.component.html',
  styleUrls: ['./board-heading.component.scss'],
})
export class BoardHeadingComponent implements OnInit {
  @ViewChild('sprintFormTemplate') sprintFormTemplate!: TemplateRef<any>;

  contextMenuVisible: boolean = false;
  currentProject: any;
  activeSprint: Sprint | null = null;
  planningSprints: Sprint[] = [];
  completedSprints: Sprint[] = [];
  isLoading = true;
  error: string | null = null;
  newSprint = {
    name: '',
    goal: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks later
  };

  constructor(
    private projectService: ProjectService,
    private sprintService: SprintService,
    private modalService: NzModalService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadProjectAndSprints();
  }

  loadProjectAndSprints(): void {
    this.isLoading = true;

    this.projectService.selectedProject$
      .pipe(
        takeUntilDestroyed(this),
        tap((project) => {
          this.currentProject = project;
          if (!project || !project.id) {
            this.error = 'No project selected';
            this.isLoading = false;
          }
        }),
        switchMap((project) => {
          if (!project || !project.id) return of([]);
          return this.sprintService.getSprintsByProjectId(project.id);
        }),
        catchError((error) => {
          console.error('Error loading sprints:', error);
          this.error = 'Failed to load sprints';
          this.isLoading = false;
          return of([]);
        })
      )
      .subscribe((sprints) => {
        this.activeSprint =
          sprints.find((sprint) => sprint.status === 'active') || null;
        this.planningSprints = sprints.filter(
          (sprint) => sprint.status === 'planning'
        );
        this.completedSprints = sprints.filter(
          (sprint) => sprint.status === 'completed'
        );
        this.isLoading = false;
      });
  }

  onContextMenuClick(): void {
    this.contextMenuVisible = false;
  }

  showCreateSprintModal(): void {
    this.resetNewSprint();
    this.modalService.create({
      nzTitle: 'Create New Sprint',
      nzContent: this.sprintFormTemplate,
      nzFooter: [
        {
          label: 'Cancel',
          onClick: () => this.modalService.closeAll(),
        },
        {
          label: 'Create',
          type: 'primary',
          onClick: () => this.createSprint(),
        },
      ],
    });
  }

  createSprint(): void {
    if (!this.currentProject || !this.currentProject.id) {
      this.message.error('No project selected');
      return;
    }

    if (!this.newSprint.name) {
      this.message.error('Sprint name is required');
      return;
    }

    const sprintData = {
      ...this.newSprint,
      status: 'planning' as const,
    };

    this.sprintService
      .createSprint(this.currentProject.id, sprintData)
      .subscribe({
        next: () => {
          this.message.success('Sprint created successfully');
          this.loadProjectAndSprints();
          this.modalService.closeAll();
        },
        error: (err) => {
          this.message.error('Failed to create sprint');
          console.error('Error creating sprint:', err);
        },
      });
  }

  startSprint(sprintId: string): void {
    this.sprintService.startSprint(sprintId).subscribe({
      next: () => {
        this.message.success('Sprint started successfully');
        this.loadProjectAndSprints();
      },
      error: (err) => {
        this.message.error('Failed to start sprint');
        console.error('Error starting sprint:', err);
      },
    });
  }

  completeSprint(sprintId: string): void {
    this.sprintService.completeSprint(sprintId).subscribe({
      next: () => {
        this.message.success('Sprint completed successfully');
        this.loadProjectAndSprints();
      },
      error: (err) => {
        this.message.error('Failed to complete sprint');
        console.error('Error completing sprint:', err);
      },
    });
  }

  private resetNewSprint(): void {
    this.newSprint = {
      name: `Sprint ${
        this.planningSprints.length +
        this.completedSprints.length +
        (this.activeSprint ? 2 : 1)
      }`,
      goal: '',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks later
    };
  }
}
