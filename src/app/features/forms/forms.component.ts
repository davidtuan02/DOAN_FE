import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FormBuilder } from '@angular/forms';

interface Report {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
  createdBy: string;
  status: 'draft' | 'published';
}

@Component({
  selector: 'app-forms',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzButtonModule,
    NzTableModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzTagModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  template: `
    <div class="p-6">
      <nz-card>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Project Reports</h2>
          <button nz-button nzType="primary" (click)="showCreateModal()">
            Create Report
          </button>
        </div>

        <nz-table
          #basicTable
          [nzData]="reports"
          [nzPageSize]="10"
          [nzShowPagination]="true"
        >
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Created At</th>
              <th>Created By</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let report of basicTable.data">
              <td>{{ report.name }}</td>
              <td>{{ report.type }}</td>
              <td>{{ report.createdAt | date }}</td>
              <td>{{ report.createdBy }}</td>
              <td>
                <nz-tag [nzColor]="report.status === 'published' ? 'green' : 'orange'">
                  {{ report.status }}
                </nz-tag>
              </td>
              <td>
                <button nz-button nzType="link" (click)="exportReport(report)">
                  Export
                </button>
                <button nz-button nzType="link" (click)="editReport(report)">
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </nz-table>
      </nz-card>
    </div>

    <!-- Create/Edit Report Modal -->
    <nz-modal
      [(nzVisible)]="isModalVisible"
      [nzTitle]="isEditing ? 'Edit Report' : 'Create Report'"
      (nzOnCancel)="handleCancel()"
      (nzOnOk)="handleOk()"
    >
      <ng-container *nzModalContent>
        <form nz-form [formGroup]="reportForm">
          <nz-form-item>
            <nz-form-label [nzSpan]="6">Report Name</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <input nz-input formControlName="name" placeholder="Enter report name" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label [nzSpan]="6">Report Type</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <nz-select formControlName="type" placeholder="Select report type">
                <nz-option nzValue="progress" nzLabel="Progress Report"></nz-option>
                <nz-option nzValue="summary" nzLabel="Summary Report"></nz-option>
                <nz-option nzValue="detailed" nzLabel="Detailed Report"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label [nzSpan]="6">Date Range</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <nz-range-picker formControlName="dateRange"></nz-range-picker>
            </nz-form-control>
          </nz-form-item>
        </form>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class FormsComponent implements OnInit {
  reports: Report[] = [];
  isModalVisible = false;
  isEditing = false;
  reportForm = this.fb.group({
    name: [''],
    type: [''],
    dateRange: [null]
  });

  constructor(
    private fb: FormBuilder,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    // Load initial reports
    this.loadReports();
  }

  loadReports(): void {
    // TODO: Implement API call to load reports
    this.reports = [
      {
        id: '1',
        name: 'Q1 Progress Report',
        type: 'Progress Report',
        createdAt: new Date(),
        createdBy: 'John Doe',
        status: 'published'
      },
      {
        id: '2',
        name: 'Project Summary',
        type: 'Summary Report',
        createdAt: new Date(),
        createdBy: 'Jane Smith',
        status: 'draft'
      }
    ];
  }

  showCreateModal(): void {
    this.isEditing = false;
    this.reportForm.reset();
    this.isModalVisible = true;
  }

  editReport(report: Report): void {
    this.isEditing = true;
    this.reportForm.patchValue({
      name: report.name,
      type: report.type
    });
    this.isModalVisible = true;
  }

  handleOk(): void {
    if (this.reportForm.valid) {
      // TODO: Implement API call to save report
      this.message.success('Report saved successfully');
      this.isModalVisible = false;
      this.loadReports();
    }
  }

  handleCancel(): void {
    this.isModalVisible = false;
  }

  exportReport(report: Report): void {
    // TODO: Implement report export functionality
    this.message.success(`Exporting report: ${report.name}`);
  }
}
