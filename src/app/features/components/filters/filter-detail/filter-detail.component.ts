import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { FilterService } from '../../../services/filter/filter.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SavedFilter } from '../../../../core/models/filter/filter.model';
import { UserService } from '../../../../core/services/user.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-filter-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzCheckboxModule,
    NzDividerModule,
    NzTagModule,
    NzSkeletonModule,
    NzIconModule,
    NzBreadCrumbModule,
    NzPopconfirmModule,
    NzModalModule,
  ],
  templateUrl: './filter-detail.component.html',
  styleUrls: ['./filter-detail.component.scss'],
})
export class FilterDetailComponent implements OnInit {
  filter?: SavedFilter;
  filterForm!: FormGroup;
  loading = true;
  isEditMode = false;
  filterId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private filterService: FilterService,
    private fb: FormBuilder,
    private message: NzMessageService,
    private modalService: NzModalService,
    private userService: UserService,
    private notification: NzNotificationService
  ) {}

  ngOnInit(): void {
    this.filterId = this.route.snapshot.paramMap.get('id') || '';
    this.isEditMode = this.route.snapshot.data['isEdit'] || false;

    if (!this.filterId) {
      // this.message.error('No filter ID provided');
      this.notification.error(
        'Error',
        `No filter ID provided`,
        { nzDuration: 3000 }
      );
      this.router.navigate(['/filters']);
      return;
    }

    this.loadFilter();
  }

  loadFilter(): void {
    this.loading = true;
    this.filterService.getFilter(this.filterId).subscribe({
      next: (filter) => {
        this.filter = filter;
        this.initForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading filter:', error);
        // this.message.error('Failed to load filter details');
        this.notification.error(
          'Error',
          `Failed to load filter details!`,
          { nzDuration: 3000 }
        );
        this.router.navigate(['/filters']);
      },
    });
  }

  initForm(): void {
    if (!this.filter) return;

    this.filterForm = this.fb.group({
      name: [
        this.filter.name,
        [Validators.required, Validators.maxLength(100)],
      ],
      description: [this.filter.description || '', [Validators.maxLength(500)]],
      isShared: [this.filter.isShared],
      isStarred: [this.filter.isStarred],
    });

    if (!this.isEditMode) {
      this.filterForm.disable();
    }
  }

  submitForm(): void {
    if (this.filterForm.invalid) {
      Object.values(this.filterForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const formValues = this.filterForm.value;
    const updatedFilter: SavedFilter = {
      ...this.filter!,
      name: formValues.name,
      description: formValues.description,
      isShared: formValues.isShared,
      isStarred: formValues.isStarred,
    };

    this.loading = true;
    this.filterService.updateFilter(updatedFilter).subscribe({
      next: (filter) => {
        this.filter = filter;
        this.loading = false;
        // this.message.success('Filter updated successfully');
        this.notification.success(
          'Success',
          `Filter updated successfully!`,
          { nzDuration: 3000 }
        );
        this.router.navigate(['/filters', filter.id]);
      },
      error: (error) => {
        console.error('Error updating filter:', error);
        // this.message.error('Failed to update filter');
        this.notification.error(
          'Error',
          `Failed to update filter!`,
          { nzDuration: 3000 }
        );
        this.loading = false;
      },
    });
  }

  toggleStar(): void {
    if (!this.filter) return;

    this.filterService
      .toggleStarFilter(this.filter.id!, !this.filter.isStarred)
      .subscribe({
        next: (updatedFilter) => {
          this.filter = updatedFilter;
          if (this.isEditMode) {
            this.filterForm.patchValue({ isStarred: updatedFilter.isStarred });
          }
        },
      });
  }

  deleteFilter(): void {
    if (!this.filter) return;

    // Check if the user is the owner of the filter
    const currentUserId = this.userService.getCurrentUserId();
    if (this.filter.owner !== currentUserId) {
      this.message.warning('You can only delete filters you own');
      return;
    }

    this.filterService.deleteFilter(this.filter.id!).subscribe({
      next: () => {
        // this.message.success('Filter deleted successfully');
        this.notification.success(
          'Success',
          `Filter deleted successfully!`,
          { nzDuration: 3000 }
        );
        this.router.navigate(['/filters']);
      },
    });
  }

  applyFilter(): void {
    if (!this.filter) return;

    const criteria = this.filter.criteria;
    const queryParams: any = {};

    if (criteria.projectId) {
      queryParams.projectId = criteria.projectId;
    }

    this.router.navigate(['/issues'], {
      queryParams,
      state: { filter: this.filter },
    });
  }

  cancelEdit(): void {
    this.router.navigate(['/filters', this.filterId]);
  }

  shareFilter(): void {
    if (!this.filter) return;

    const url = `${window.location.origin}/issues?filterId=${this.filter.id}`;

    // Copy to clipboard
    navigator.clipboard.writeText(url).then(
      () => {
        // this.message.success('Filter link copied to clipboard!');
        this.notification.success(
          'Success',
          `Filter link copied to clipboard!`,
          { nzDuration: 3000 }
        );
      },
      () => {
        // Show the URL in a modal if clipboard copy fails
        this.modalService.info({
          nzTitle: 'Share Filter Link',
          nzContent: `<div>Copy this link to share the filter:<br><input class="w-full p-2 mt-2 border rounded" value="${url}" /></div>`,
          nzOnOk: () => {},
        });
      }
    );
  }
}
