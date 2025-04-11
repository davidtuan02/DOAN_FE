import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap, finalize } from 'rxjs/operators';
import {
  SavedFilter,
  FilterCriteria,
} from '../../../core/models/filter/filter.model';
import { BASE_URL } from '../../../core/constants/api.const';
import { UserService } from '../../../core/services/user.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  private apiUrl = `${BASE_URL}/filters`;
  private _savedFilters = new BehaviorSubject<SavedFilter[]>([]);

  savedFilters$ = this._savedFilters.asObservable();

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private message: NzMessageService
  ) {
    this.loadSavedFilters();
  }

  // Get all filters for the current user
  loadSavedFilters(): void {
    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.message.error('No user is logged in');
      return;
    }

    // Get both user's own filters and shared filters
    this.http
      .get<any[]>(`${this.apiUrl}`)
      .pipe(
        map((filters) => {
          // Transform backend response to match our frontend model
          return filters.map((filter) =>
            this.mapBackendFilterToFrontend(filter)
          );
        }),
        catchError((error) => {
          console.error('Error fetching filters:', error);
          return of([]);
        })
      )
      .subscribe((filters) => {
        // Filter to only include the user's filters and shared filters
        const userFilters = filters.filter(
          (filter) => filter.owner === userId || filter.isShared
        );
        this._savedFilters.next(userFilters);
      });
  }

  // Save a new filter
  saveFilter(filter: SavedFilter): Observable<SavedFilter> {
    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.message.error('No user is logged in');
      return of({} as SavedFilter);
    }

    // Convert frontend model to backend model
    const filterToSave = this.mapFrontendFilterToBackend(filter, userId);

    return this.http.post<any>(`${this.apiUrl}`, filterToSave).pipe(
      map((response) => this.mapBackendFilterToFrontend(response)),
      tap((newFilter) => {
        const currentFilters = this._savedFilters.value;
        this._savedFilters.next([...currentFilters, newFilter]);
        this.message.success('Filter saved successfully');
      }),
      catchError((error) => {
        console.error('Error saving filter:', error);
        this.message.error('Failed to save filter');
        throw error;
      })
    );
  }

  // Update an existing filter
  updateFilter(filter: SavedFilter): Observable<SavedFilter> {
    if (!filter.id) {
      throw new Error('Filter ID is required for update');
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.message.error('No user is logged in');
      return of({} as SavedFilter);
    }

    // Check if the user owns this filter
    if (filter.owner !== userId) {
      this.message.error('You can only update your own filters');
      return of(filter);
    }

    // Convert frontend model to backend model
    const filterToUpdate = this.mapFrontendFilterToBackend(filter, userId);

    return this.http
      .put<any>(`${this.apiUrl}/${filter.id}`, filterToUpdate)
      .pipe(
        map((response) => this.mapBackendFilterToFrontend(response)),
        tap((updatedFilter) => {
          const currentFilters = this._savedFilters.value;
          const index = currentFilters.findIndex(
            (f) => f.id === updatedFilter.id
          );

          if (index !== -1) {
            const updatedFilters = [...currentFilters];
            updatedFilters[index] = updatedFilter;
            this._savedFilters.next(updatedFilters);
          }

          this.message.success('Filter updated successfully');
        }),
        catchError((error) => {
          console.error('Error updating filter:', error);
          this.message.error('Failed to update filter');
          throw error;
        })
      );
  }

  // Delete a filter
  deleteFilter(filterId: string): Observable<void> {
    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.message.error('No user is logged in');
      return of(undefined);
    }

    // Find the filter to check ownership
    const filter = this._savedFilters.value.find((f) => f.id === filterId);
    if (filter && filter.owner !== userId) {
      this.message.error('You can only delete your own filters');
      return of(undefined);
    }

    return this.http.delete<void>(`${this.apiUrl}/${filterId}`).pipe(
      tap(() => {
        const currentFilters = this._savedFilters.value;
        this._savedFilters.next(
          currentFilters.filter((f) => f.id !== filterId)
        );
        this.message.success('Filter deleted successfully');
      }),
      catchError((error) => {
        console.error('Error deleting filter:', error);
        this.message.error('Failed to delete filter');
        throw error;
      })
    );
  }

  // Toggle star status
  toggleStarFilter(
    filterId: string,
    isStarred: boolean
  ): Observable<SavedFilter> {
    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.message.error('No user is logged in');
      return of({} as SavedFilter);
    }

    return this.http
      .patch<any>(`${this.apiUrl}/${filterId}/star`, { isStarred })
      .pipe(
        map((response) => this.mapBackendFilterToFrontend(response)),
        tap((updatedFilter) => {
          const currentFilters = this._savedFilters.value;
          const index = currentFilters.findIndex(
            (f) => f.id === updatedFilter.id
          );

          if (index !== -1) {
            const updatedFilters = [...currentFilters];
            updatedFilters[index] = updatedFilter;
            this._savedFilters.next(updatedFilters);
          }
        }),
        catchError((error) => {
          console.error('Error starring filter:', error);
          this.message.error('Failed to update filter');
          throw error;
        })
      );
  }

  // Get filter by ID
  getFilter(filterId: string): Observable<SavedFilter> {
    return this.http.get<any>(`${this.apiUrl}/${filterId}`).pipe(
      map((response) => this.mapBackendFilterToFrontend(response)),
      catchError((error) => {
        console.error(`Error fetching filter ${filterId}:`, error);
        this.message.error('Failed to load filter');
        throw error;
      })
    );
  }

  // Get filters for a specific project
  loadProjectFilters(projectId: string): void {
    if (!projectId) {
      console.error(
        'No project ID provided when trying to load project filters'
      );
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      console.error('No user is logged in when trying to load project filters');
      return;
    }

    // Show loading indicator
    const loadingMessage = this.message.loading('Loading saved filters...', {
      nzDuration: 0,
    }).messageId;

    this.http
      .get<any[]>(`${this.apiUrl}/project/${projectId}`)
      .pipe(
        map((filters) => {
          return filters.map((filter) =>
            this.mapBackendFilterToFrontend(filter)
          );
        }),
        catchError((error) => {
          console.error(
            `Error fetching filters for project ${projectId}:`,
            error
          );

          // Close loading message and show error
          this.message.remove(loadingMessage);
          this.message.error(
            'Failed to load saved filters. Using cached filters if available.'
          );

          // Return current filters if we have them, empty array otherwise
          return of(
            this._savedFilters.value.length > 0 ? this._savedFilters.value : []
          );
        }),
        finalize(() => {
          // Remove loading message
          this.message.remove(loadingMessage);
        })
      )
      .subscribe((filters) => {
        // Filter to only include the user's filters and shared filters
        const userFilters = filters.filter(
          (filter) => filter.owner === userId || filter.isShared
        );

        if (userFilters.length > 0) {
          this._savedFilters.next(userFilters);
          console.log(
            `Loaded ${userFilters.length} filters for project ${projectId}`
          );
        } else {
          console.log(`No filters found for project ${projectId}`);
        }
      });
  }

  // Helper method to convert backend filter model to frontend model
  private mapBackendFilterToFrontend(backendFilter: any): SavedFilter {
    console.log('Received filter from backend:', backendFilter);

    const criteria: FilterCriteria = {
      projectId: backendFilter.projectId,
    };

    // Extract criteria from backend format
    if (backendFilter.criteria && backendFilter.criteria.length > 0) {
      backendFilter.criteria.forEach((criterion: any) => {
        // Bỏ qua tiêu chí projectId vì đã được gán ở trên
        if (criterion.field === 'projectId') {
          return;
        }

        if (criterion.field === 'searchTerm' && criterion.value) {
          criteria.searchTerm = criterion.value;
        } else if (criterion.field === 'types' && criterion.value) {
          criteria.types = Array.isArray(criterion.value)
            ? criterion.value
            : [criterion.value];
        } else if (criterion.field === 'statuses' && criterion.value) {
          criteria.statuses = Array.isArray(criterion.value)
            ? criterion.value
            : [criterion.value];
        } else if (criterion.field === 'priorities' && criterion.value) {
          criteria.priorities = Array.isArray(criterion.value)
            ? criterion.value
            : [criterion.value];
        } else if (criterion.field === 'assigneeIds' && criterion.value) {
          criteria.assigneeIds = Array.isArray(criterion.value)
            ? criterion.value
            : [criterion.value];
        } else if (criterion.field === 'createdWithin' && criterion.value) {
          criteria.createdWithin = criterion.value;
        } else if (criterion.field === 'updatedWithin' && criterion.value) {
          criteria.updatedWithin = criterion.value;
        }
      });
    }

    return {
      id: backendFilter.id,
      name: backendFilter.name,
      description: backendFilter.description || '',
      owner: backendFilter.createdBy,
      isShared: backendFilter.isPublic,
      isStarred: backendFilter.isStarred || false,
      createdAt: new Date(backendFilter.createdAt),
      updatedAt: new Date(backendFilter.updatedAt),
      criteria: criteria,
    };
  }

  // Helper method to convert frontend filter model to backend model
  private mapFrontendFilterToBackend(filter: SavedFilter, userId: string): any {
    // Định nghĩa các hằng số enum giống với backend
    const FILTER_OPERATOR = {
      EQUALS: 'equals',
      NOT_EQUALS: 'not_equals',
      CONTAINS: 'contains',
      GREATER_THAN: 'greater_than',
      LESS_THAN: 'less_than',
      IN: 'in',
    };

    const criteria: any[] = [];

    // Extract criteria into backend format
    if (filter.criteria) {
      if (filter.criteria.searchTerm) {
        criteria.push({
          field: 'searchTerm',
          operator: FILTER_OPERATOR.CONTAINS,
          value: filter.criteria.searchTerm,
        });
      }

      if (filter.criteria.types && filter.criteria.types.length > 0) {
        criteria.push({
          field: 'types',
          operator: FILTER_OPERATOR.IN,
          value: filter.criteria.types,
        });
      }

      if (filter.criteria.statuses && filter.criteria.statuses.length > 0) {
        criteria.push({
          field: 'statuses',
          operator: FILTER_OPERATOR.IN,
          value: filter.criteria.statuses,
        });
      }

      if (filter.criteria.priorities && filter.criteria.priorities.length > 0) {
        criteria.push({
          field: 'priorities',
          operator: FILTER_OPERATOR.IN,
          value: filter.criteria.priorities,
        });
      }

      if (
        filter.criteria.assigneeIds &&
        filter.criteria.assigneeIds.length > 0
      ) {
        criteria.push({
          field: 'assigneeIds',
          operator: FILTER_OPERATOR.IN,
          value: filter.criteria.assigneeIds,
        });
      }

      if (filter.criteria.createdWithin) {
        criteria.push({
          field: 'createdWithin',
          operator: FILTER_OPERATOR.LESS_THAN,
          value: filter.criteria.createdWithin,
        });
      }

      if (filter.criteria.updatedWithin) {
        criteria.push({
          field: 'updatedWithin',
          operator: FILTER_OPERATOR.LESS_THAN,
          value: filter.criteria.updatedWithin,
        });
      }
    }

    // Đảm bảo có ít nhất một tiêu chí nếu không có tiêu chí nào được chọn
    if (criteria.length === 0 && filter.criteria.projectId) {
      // Thêm một tiêu chí mặc định - tất cả các issue trong project
      criteria.push({
        field: 'projectId',
        operator: FILTER_OPERATOR.EQUALS,
        value: filter.criteria.projectId,
      });
    }

    console.log('Sending filter criteria to backend:', criteria);

    return {
      id: filter.id,
      name: filter.name,
      description: filter.description || '',
      isPublic: filter.isShared,
      isStarred: filter.isStarred || false,
      createdBy: userId,
      projectId: filter.criteria.projectId,
      criteria: criteria,
    };
  }
}
