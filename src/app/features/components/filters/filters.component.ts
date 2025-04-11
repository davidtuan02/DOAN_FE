import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { FilterService } from '../../services/filter/filter.service';
import { SavedFilter } from '../../../core/models/filter/filter.model';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzDropDownModule,
    NzToolTipModule,
    NzDividerModule,
    NzTabsModule,
    NzInputModule,
    FormsModule,
    NzEmptyModule,
    NzPopconfirmModule,
  ],
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss'],
})
export class FiltersComponent implements OnInit {
  allFilters: SavedFilter[] = [];
  myFilters: SavedFilter[] = [];
  starredFilters: SavedFilter[] = [];
  sharedFilters: SavedFilter[] = [];
  searchTerm: string = '';
  filteredFilters: SavedFilter[] = [];
  loading = true;

  constructor(
    private filterService: FilterService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadFilters();
  }

  loadFilters(): void {
    this.loading = true;
    this.filterService.savedFilters$.subscribe({
      next: (filters) => {
        this.allFilters = filters;
        const currentUserId = this.userService.getCurrentUserId();
        this.myFilters = filters.filter((f) => f.owner === currentUserId);
        this.starredFilters = filters.filter((f) => f.isStarred);
        this.sharedFilters = filters.filter((f) => f.isShared);
        this.applySearch();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading filters:', error);
        this.loading = false;
      },
    });
  }

  applySearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFilters = [...this.allFilters];
      return;
    }

    const search = this.searchTerm.toLowerCase().trim();
    this.filteredFilters = this.allFilters.filter(
      (filter) =>
        filter.name.toLowerCase().includes(search) ||
        (filter.description &&
          filter.description.toLowerCase().includes(search))
    );
  }

  toggleStar(filter: SavedFilter, event: MouseEvent): void {
    event.stopPropagation();
    this.filterService
      .toggleStarFilter(filter.id!, !filter.isStarred)
      .subscribe();
  }

  deleteFilter(filter: SavedFilter, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.filterService.deleteFilter(filter.id!).subscribe();
  }

  formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
