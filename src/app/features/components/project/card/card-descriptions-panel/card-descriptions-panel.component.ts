import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  TemplateRef,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import { Card, PartialCard } from '../../../../../core/models';
import { takeUntil, filter, switchMap, catchError, tap } from 'rxjs/operators';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AttachmentService } from '../../../../../services/attachment.service';
import { CommonModule } from '@angular/common';
import { CardTitleComponent } from '../card-title/card-title.component';
import { CardDescriptionComponent } from '../card-description/card-description.component';
import { SvgIconComponent } from '../../../../../shared/components';
import { CardAttachmentComponent } from '../card-attachment/card-attachment.component';
import { CardEnvironmentComponent } from '../card-environment/card-environment.component';
import { CardActivityComponent } from '../card-activity/card-activity.component';
import * as fromStore from '../../../../../core/store';
import { FormsModule } from '@angular/forms';
import {
  IssueService,
  Issue,
} from '../../../../../features/services/issue.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Router } from '@angular/router';
import { ProjectService } from '../../../../../core/services/project.service';

@Component({
  selector: 'app-card-descriptions-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardTitleComponent,
    CardDescriptionComponent,
    SvgIconComponent,
    CardAttachmentComponent,
    CardEnvironmentComponent,
    CardActivityComponent,
  ],
  templateUrl: './card-descriptions-panel.component.html',
  styleUrls: ['./card-descriptions-panel.component.scss'],
})
export class CardDescriptionsPanelComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('childTaskDetailModal') childTaskDetailModal!: TemplateRef<any>;

  selectedCard$: Observable<Card | null | undefined>;
  private unsubscribe$ = new Subject<void>();
  private cardId: string | null = null;

  // Child tasks
  childTasks: Issue[] = [];
  projectId: string = '';
  showAddChildForm: boolean = false;
  newChildIssue: { title: string; type: string } = {
    title: '',
    type: 'Sub-task',
  };
  newChildTask: { title: string; description: string; type: string } = {
    title: '',
    description: '',
    type: 'Sub-task',
  };

  constructor(
    private store: Store<fromStore.AppState>,
    private message: NzMessageService,
    private attachmentService: AttachmentService,
    private issueService: IssueService,
    private modalService: NzModalService,
    private notification: NzNotificationService,
    private router: Router,
    private projectService: ProjectService
  ) {
    this.selectedCard$ = this.store.select(fromStore.selectSelectedCard);
  }

  ngOnInit(): void {
    // Get projectId from the current project
    const selectedProject = this.projectService.getSelectedProject();
    if (selectedProject) {
      this.projectId = selectedProject.id || '';
    }

    this.selectedCard$.pipe(takeUntil(this.unsubscribe$)).subscribe((card) => {
      if (card) {
        this.cardId = card.id;
        // Load child tasks when card changes
        this.loadChildTasks();
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  onUpdateCard(partial: PartialCard): void {
    this.store.dispatch(fromStore.updateCard({ partial }));
  }

  openAttachmentUpload(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  handleFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;

    if (fileInput.files && fileInput.files.length > 0 && this.cardId) {
      const file = fileInput.files[0];
      this.uploadFile(file);

      // Reset the file input
      fileInput.value = '';
    }
  }

  // Child issues methods
  loadChildTasks(): void {
    if (!this.cardId) return;

    this.issueService
      .getChildTasks(this.cardId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (tasks) => {
          this.childTasks = tasks;
        },
        error: (error) => {
          console.error('Error loading child tasks:', error);
          this.message.error('Failed to load child tasks');
        },
      });
  }

  getChildTasksProgressPercentage(): number {
    if (!this.childTasks || this.childTasks.length === 0) return 0;

    const completedTasks = this.childTasks.filter(
      (task) => task.status === 'Done'
    ).length;
    return Math.round((completedTasks / this.childTasks.length) * 100);
  }

  createChildIssue(): void {
    this.showAddChildForm = true;
  }

  cancelAddChild(): void {
    this.showAddChildForm = false;
    this.newChildIssue = { title: '', type: 'Sub-task' };
  }

  confirmAddChild(): void {
    if (!this.cardId || !this.newChildIssue.title) return;

    const childTask: Partial<Issue> = {
      title: this.newChildIssue.title,
      type: this.newChildIssue.type as any,
      status: 'To Do',
      priority: 'Medium',
    };

    this.issueService
      .createChildTask(childTask, this.cardId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (createdIssue) => {
          this.message.success('Child issue created successfully');
          this.showAddChildForm = false;
          this.newChildIssue = { title: '', type: 'Sub-task' };
          this.loadChildTasks();
        },
        error: (error) => {
          this.message.error(
            'Failed to create child issue: ' +
              (error.message || 'Unknown error')
          );
        },
      });
  }

  // For the modal approach
  createChildTask(): void {
    if (!this.cardId) return;

    this.newChildTask = { title: '', description: '', type: 'Sub-task' };

    this.modalService.create({
      nzTitle: 'Create child issue',
      nzContent: this.childTaskDetailModal,
      nzFooter: null,
      nzMaskClosable: false,
      nzClosable: true,
    });
  }

  confirmCreateChildModal(): void {
    if (!this.cardId || !this.newChildTask.title) return;

    const childTask: Partial<Issue> = {
      title: this.newChildTask.title,
      description: this.newChildTask.description,
      status: 'To Do',
      priority: 'Medium',
      type: this.newChildTask.type as any,
    };

    this.issueService
      .createChildTask(childTask, this.cardId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (createdIssue) => {
          this.notification.success(
            'Success',
            'Child issue created successfully'
          );
          this.modalService.closeAll();
          this.newChildTask = { title: '', description: '', type: 'Sub-task' };

          // Refresh child tasks data
          this.loadChildTasks();
        },
        error: (error) => {
          this.notification.error(
            'Error',
            error.message || 'An error occurred while creating child issue'
          );
        },
      });
  }

  cancelCreateChildModal(): void {
    this.modalService.closeAll();
    this.newChildTask = { title: '', description: '', type: 'Sub-task' };
  }

  openChildTask(childId: string): void {
    // Navigate to the child task
    this.router.navigate(['/projects', this.projectId, 'board'], {
      queryParams: { taskId: childId },
    });
  }

  private uploadFile(file: File): void {
    if (!this.cardId) {
      this.message.error('Cannot upload file: No card selected');
      return;
    }

    const loadingMessage = this.message.loading(`Uploading ${file.name}...`, {
      nzDuration: 0,
    }).messageId;

    this.attachmentService.uploadAttachment(file, this.cardId).subscribe({
      next: () => {
        this.message.remove(loadingMessage);
        this.message.success(`${file.name} uploaded successfully`);
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.message.remove(loadingMessage);
        this.message.error(`Failed to upload ${file.name}`);
      },
    });
  }
}
