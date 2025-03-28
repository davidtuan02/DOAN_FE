import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Team,
  TeamAccess,
  TeamService,
} from '../../../../core/services/team.service';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-team-detail',
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss'],
  providers: [DatePipe],
})
export class TeamDetailComponent implements OnInit {
  teamId: string = '';
  team: Team | null = null;
  teamAccess: TeamAccess | null = null;
  loading = false;
  updating = false;
  error: string | null = null;
  editMode = false;

  // For breadcrumbs
  breadcrumbs = [
    { label: 'Teams', route: '/teams' },
    { label: 'Loading...', route: '' },
  ];

  // For the tabs
  activeTab: 'overview' | 'members' | 'projects' = 'overview';

  // For team statistics
  projectsCount = 0;
  tasksCompleted = 0;

  // For delete confirmation
  isDeleteModalVisible = false;
  deleteLoading = false;

  constructor(
    private teamService: TeamService,
    private route: ActivatedRoute,
    public router: Router,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.teamId = this.route.snapshot.paramMap.get('id') || '';

    // Check if edit mode is requested
    this.route.queryParams.subscribe((params) => {
      if (params['edit'] === 'true') {
        this.editMode = true;
      }
    });

    if (this.teamId) {
      this.loadTeam();
      this.checkTeamAccess();
      this.loadTeamStatistics();
    } else {
      this.error = 'Team ID is missing';
    }
  }

  loadTeam(): void {
    this.loading = true;
    this.teamService
      .getTeamById(this.teamId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (team) => {
          this.team = team;
          // Update breadcrumbs with team name
          this.breadcrumbs[1].label = team.name;
        },
        error: (err) => {
          this.error = 'Failed to load team details';
          console.error(err);
        },
      });
  }

  checkTeamAccess(): void {
    this.teamService.validateTeamAccess(this.teamId).subscribe({
      next: (access) => {
        this.teamAccess = access;
      },
      error: (err) => {
        console.error('Failed to validate team access', err);
      },
    });
  }

  loadTeamStatistics(): void {
    // Load projects count
    this.teamService.getTeamProjects(this.teamId).subscribe({
      next: (projects) => {
        this.projectsCount = projects.length;
        // In a real app, you'd sum up tasks completed across all projects
        this.tasksCompleted = Math.floor(Math.random() * 50); // Mock data
      },
      error: (err) => {
        console.error('Failed to load team projects for statistics', err);
      },
    });
  }

  onUpdateTeam(formData: { name: string; description?: string }): void {
    this.updating = true;
    this.teamService
      .updateTeam(this.teamId, formData)
      .pipe(
        finalize(() => {
          this.updating = false;
          this.editMode = false;
        })
      )
      .subscribe({
        next: (team) => {
          this.team = team;
          // Update breadcrumbs with new team name
          this.breadcrumbs[1].label = team.name;
          this.message.success('Team updated successfully');
        },
        error: (err) => {
          this.error = 'Failed to update team';
          this.message.error(
            `Failed to update team: ${err.message || 'Unknown error'}`
          );
          console.error(err);
        },
      });
  }

  setActiveTab(tab: 'overview' | 'members' | 'projects'): void {
    this.activeTab = tab;
  }

  confirmDeleteTeam(): void {
    this.isDeleteModalVisible = true;
  }

  handleDeleteCancel(): void {
    this.isDeleteModalVisible = false;
  }

  handleDeleteOk(): void {
    this.deleteLoading = true;
    this.teamService
      .deleteTeam(this.teamId)
      .pipe(
        finalize(() => {
          this.deleteLoading = false;
          this.isDeleteModalVisible = false;
        })
      )
      .subscribe({
        next: () => {
          this.message.success(`Team "${this.team?.name}" has been deleted`);
          this.router.navigate(['/teams']);
        },
        error: (err) => {
          this.message.error(
            `Failed to delete team: ${err.message || 'Unknown error'}`
          );
          console.error('Failed to delete team', err);
        },
      });
  }

  toggleEditMode(): void {
    if (this.editMode) {
      this.editMode = false;
    } else {
      // Navigate to the dedicated edit page instead of toggling edit mode inline
      this.router.navigate(['/teams', this.teamId, 'edit']);
    }
  }

  cancelEdit(): void {
    this.editMode = false;
  }

  canManageTeam(): boolean {
    return (
      this.teamAccess?.role === 'leader' || this.teamAccess?.role === 'admin'
    );
  }
}
