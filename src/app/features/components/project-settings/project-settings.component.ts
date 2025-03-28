import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SvgIconComponent } from '../../../shared/components';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, SvgIconComponent, FormsModule],
  templateUrl: './project-settings.component.html',
})
export class ProjectSettingsComponent implements OnInit {
  project = {
    name: 'Sample Project',
    key: 'SP',
    description: 'This is a sample project description',
    lead: 'John Doe',
    category: 'Software',
    type: 'Software',
    avatar: null,
  };

  settingsTabs = [
    {
      id: 'details',
      label: 'Details',
      icon: 'settings',
      active: true,
    },
    {
      id: 'access',
      label: 'Access',
      icon: 'lock',
      active: false,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'bell',
      active: false,
    },
    {
      id: 'columns',
      label: 'Columns and statuses',
      icon: 'board',
      active: false,
    },
    {
      id: 'filters',
      label: 'Custom filters',
      icon: 'search',
      active: false,
    },
  ];

  // Columns and statuses data
  columns = [
    {
      id: 'todo',
      name: 'To Do',
      statuses: [
        { id: 'backlog', name: 'Backlog', color: '#6B778C' },
        { id: 'selected', name: 'Selected for Development', color: '#6B778C' },
      ],
    },
    {
      id: 'inprogress',
      name: 'In Progress',
      statuses: [{ id: 'inprogress', name: 'In Progress', color: '#0052CC' }],
    },
    {
      id: 'done',
      name: 'Done',
      statuses: [{ id: 'done', name: 'Done', color: '#36B37E' }],
    },
  ];

  // Custom filters data
  filters = [
    {
      id: 'my-issues',
      name: 'My Issues',
      description: 'Issues assigned to me',
      query: 'assignee = currentUser()',
      isShared: false,
    },
    {
      id: 'recently-updated',
      name: 'Recently Updated',
      description: 'Issues updated in the last 7 days',
      query: 'updated >= -7d',
      isShared: true,
    },
  ];

  constructor() {}

  ngOnInit(): void {}

  onTabClick(tabId: string): void {
    this.settingsTabs.forEach((tab) => {
      tab.active = tab.id === tabId;
    });
  }

  onSave(): void {
    // TODO: Implement save functionality
    console.log('Saving project settings:', this.project);
  }

  // Columns and statuses methods
  addColumn(): void {
    this.columns.push({
      id: `column-${this.columns.length + 1}`,
      name: 'New Column',
      statuses: [],
    });
  }

  removeColumn(columnId: string): void {
    this.columns = this.columns.filter((col) => col.id !== columnId);
  }

  addStatus(columnId: string): void {
    const column = this.columns.find((col) => col.id === columnId);
    if (column) {
      column.statuses.push({
        id: `status-${column.statuses.length + 1}`,
        name: 'New Status',
        color: '#6B778C',
      });
    }
  }

  removeStatus(columnId: string, statusId: string): void {
    const column = this.columns.find((col) => col.id === columnId);
    if (column) {
      column.statuses = column.statuses.filter(
        (status) => status.id !== statusId
      );
    }
  }

  // Custom filters methods
  addFilter(): void {
    this.filters.push({
      id: `filter-${this.filters.length + 1}`,
      name: 'New Filter',
      description: 'Enter filter description',
      query: '',
      isShared: false,
    });
  }

  removeFilter(filterId: string): void {
    this.filters = this.filters.filter((filter) => filter.id !== filterId);
  }

  toggleFilterShare(filterId: string): void {
    const filter = this.filters.find((f) => f.id === filterId);
    if (filter) {
      filter.isShared = !filter.isShared;
    }
  }
}
