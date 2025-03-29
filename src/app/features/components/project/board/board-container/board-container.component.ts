import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardComponent } from '../board/board.component';
import { BoardHeadingComponent } from '../board-heading/board-heading.component';
import { ProjectService } from '../../../../../core/services/project.service';
import {
  TeamPermissionsService,
  PermissionType,
} from '../../../../../core/services/team-permissions.service';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CardFilter } from '../../../../../core/models/card/card-filter';
import * as fromStore from '../../../../../core/store';
import { Store, select } from '@ngrx/store';

@Component({
  selector: 'app-board-container',
  standalone: true,
  imports: [
    CommonModule,
    BoardComponent,
    BoardHeadingComponent,
    NzEmptyModule,
    RouterModule,
  ],
  template: `
    <div class="flex flex-col h-full">
      <app-board-heading></app-board-heading>

      <div *ngIf="loading" class="flex-1 flex justify-center items-center">
        <div
          class="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"
        ></div>
      </div>

      <div *ngIf="!loading && !error && hasProject" class="flex-1">
        <app-board></app-board>
      </div>

      <div
        *ngIf="!loading && error"
        class="flex-1 p-4 flex justify-center items-center"
      >
        <div
          class="p-5 bg-red-50 text-red-600 rounded-md border border-red-200"
        >
          {{ error }}
        </div>
      </div>

      <div
        *ngIf="!loading && !error && !hasProject"
        class="flex-1 flex justify-center items-center"
      >
        <nz-empty
          nzDescription="No project is selected. Please select a project to view its board."
          [nzNotFoundContent]="contentTemplate"
        >
          <ng-template #contentTemplate>
            <button
              class="px-4 py-2 mt-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              routerLink="/projects"
            >
              View Projects
            </button>
          </ng-template>
        </nz-empty>
      </div>
    </div>
  `,
})
export class BoardContainerComponent implements OnInit {
  loading = true;
  error: string | null = null;
  hasProject = false;
  canCreateTasks = false;
  clearFiltersVisible$!: Observable<boolean>;

  constructor(
    private projectService: ProjectService,
    private permissionService: TeamPermissionsService,
    private store: Store<fromStore.AppState>
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.error = null;

    this.projectService.selectedProject$.subscribe((project) => {
      this.loading = false;
      this.hasProject = !!project && !!project.id;

      // Check if user can create tasks in this project's team if project exists
      if (project && this.hasProject && project.team && project.team.id) {
        // Check if user can create tasks in this project's team
        this.permissionService
          .hasPermission(project.team.id, PermissionType.CREATE_TASK)
          .subscribe((canCreate) => {
            this.canCreateTasks = canCreate;
          });
      }
    });

    this.clearFiltersVisible$ = this.store.pipe(
      select(fromStore.clearFilterVisible)
    );
  }

  updateCardFilters(filters: CardFilter): void {
    this.store.dispatch(fromStore.updateCardFilters({ filters }));
  }
}
