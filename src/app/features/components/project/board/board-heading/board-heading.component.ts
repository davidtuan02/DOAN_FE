import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { SvgIconComponent } from '../../../../../shared/components';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../../../core/services/project.service';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
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
    private modalService: NzModalService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadProject();
  }

  loadProject(): void {
    this.isLoading = true;

    this.projectService.selectedProject$
      .pipe(
        takeUntilDestroyed(this),
        tap((project) => {
          this.currentProject = project;
          if (!project || !project.id) {
            this.error = 'No project selected';
          } else {
            this.error = null;
          }
          this.isLoading = false;
        }),
        catchError((error) => {
          console.error('Error loading project:', error);
          this.error = 'Failed to load project';
          this.isLoading = false;
          return of(null);
        })
      )
      .subscribe();
  }

  onContextMenuClick(): void {
    this.contextMenuVisible = false;
  }
}
