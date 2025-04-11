import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NzModalModule, NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import {
  FilterCriteria,
  SavedFilter,
} from '../../../../core/models/filter/filter.model';
import { FilterService } from '../../../services/filter/filter.service';
import { UserService } from '../../../../core/services/user.service';

interface ModalData {
  filterCriteria: FilterCriteria;
  existingFilter?: SavedFilter;
}

@Component({
  selector: 'app-save-filter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzDividerModule,
  ],
  templateUrl: './save-filter-dialog.component.html',
  styleUrls: ['./save-filter-dialog.component.scss'],
})
export class SaveFilterDialogComponent implements OnInit {
  readonly modalData: ModalData = inject(NZ_MODAL_DATA);

  filterForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private filterService: FilterService,
    private userService: UserService,
    private modalRef: NzModalRef
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    const userId = this.userService.getCurrentUserId();

    this.filterForm = this.fb.group({
      name: [
        this.modalData.existingFilter?.name || '',
        [Validators.required, Validators.maxLength(100)],
      ],
      description: [
        this.modalData.existingFilter?.description || '',
        [Validators.maxLength(500)],
      ],
      isShared: [this.modalData.existingFilter?.isShared || false],
      isStarred: [this.modalData.existingFilter?.isStarred || false],
    });
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

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.modalRef.close();
      return;
    }

    this.loading = true;
    const formValues = this.filterForm.value;

    const filter: SavedFilter = {
      id: this.modalData.existingFilter?.id,
      name: formValues.name,
      description: formValues.description,
      owner: userId,
      isShared: formValues.isShared,
      isStarred: formValues.isStarred,
      criteria: this.modalData.filterCriteria,
    };

    if (this.modalData.existingFilter?.id) {
      // Update existing filter
      this.filterService.updateFilter(filter).subscribe({
        next: (result) => {
          this.loading = false;
          this.modalRef.close(result);
        },
        error: (error) => {
          console.error('Error updating filter:', error);
          this.loading = false;
        },
      });
    } else {
      // Create new filter
      this.filterService.saveFilter(filter).subscribe({
        next: (result) => {
          this.loading = false;
          this.modalRef.close(result);
        },
        error: (error) => {
          console.error('Error saving filter:', error);
          this.loading = false;
        },
      });
    }
  }

  cancel(): void {
    this.modalRef.close(null);
  }
}
