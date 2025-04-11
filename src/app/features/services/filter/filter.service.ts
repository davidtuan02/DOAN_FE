import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
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
      .get<SavedFilter[]>(`${this.apiUrl}`)
      .pipe(
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

    // Ensure the owner is set to the current user
    const filterToSave: SavedFilter = {
      ...filter,
      owner: userId,
    };

    return this.http.post<SavedFilter>(`${this.apiUrl}`, filterToSave).pipe(
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

    return this.http
      .put<SavedFilter>(`${this.apiUrl}/${filter.id}`, filter)
      .pipe(
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
      .patch<SavedFilter>(`${this.apiUrl}/${filterId}/star`, { isStarred })
      .pipe(
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
    return this.http.get<SavedFilter>(`${this.apiUrl}/${filterId}`).pipe(
      catchError((error) => {
        console.error(`Error fetching filter ${filterId}:`, error);
        this.message.error('Failed to load filter');
        throw error;
      })
    );
  }
}
