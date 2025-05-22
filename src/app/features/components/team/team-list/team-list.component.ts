import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Team, TeamService } from '../../../../core/services/team.service';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PermissionService } from '../../../../core/services/permission.service';
import { UserRole } from '../../../../core/models/user/user';

@Component({
  selector: 'app-team-list',
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.scss'],
  providers: [DatePipe],
})
export class TeamListComponent implements OnInit {
  teams: Team[] = [];
  myTeams: Team[] = [];
  filteredTeams: Team[] = [];
  filteredMyTeams: Team[] = [];
  loading = false;
  error: string | null = null;
  activeTab: 'all-teams' | 'my-teams' = 'all-teams';
  searchTerm = '';

  // For delete confirmation
  isDeleteModalVisible = false;
  deleteLoading = false;
  teamToDelete: Team | null = null;

  // For permissions
  canCreateTeam = false;

  constructor(
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute,
    private message: NzMessageService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    // Check for filter parameter in URL
    this.route.queryParams.subscribe((params) => {
      if (params['filter'] === 'my-teams') {
        this.activeTab = 'my-teams';
      } else {
        this.activeTab = 'all-teams';
      }
    });

    this.loadTeams();
    this.loadMyTeams();
    this.checkPermissions();
  }

  private checkPermissions(): void {
    this.permissionService.getCurrentUserRole().subscribe(role => {
      this.canCreateTeam = role === UserRole.ADMIN;
    });
  }

  loadTeams(): void {
    this.loading = true;
    this.teamService
      .getAllTeams()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (teams) => {
          this.teams = teams;
          this.filteredTeams = [...teams];
          this.applySearch();
        },
        error: (err) => {
          this.error = 'Failed to load teams';
          console.error(err);
        },
      });
  }

  loadMyTeams(): void {
    this.teamService.getMyTeams().subscribe({
      next: (teams) => {
        this.myTeams = teams;
        this.filteredMyTeams = [...teams];
        this.applySearch();
      },
      error: (err) => {
        console.error('Failed to load my teams', err);
      },
    });
  }

  onSearch(): void {
    this.applySearch();
  }

  applySearch(): void {
    const search = this.searchTerm.toLowerCase().trim();

    if (!search) {
      this.filteredTeams = [...this.teams];
      this.filteredMyTeams = [...this.myTeams];
      return;
    }

    this.filteredTeams = this.teams.filter(
      (team) =>
        team.name.toLowerCase().includes(search) ||
        (team.description && team.description.toLowerCase().includes(search))
    );

    this.filteredMyTeams = this.myTeams.filter(
      (team) =>
        team.name.toLowerCase().includes(search) ||
        (team.description && team.description.toLowerCase().includes(search))
    );
  }

  createTeam(): void {
    this.router.navigate(['/teams/new']);
  }

  viewTeam(teamId: string): void {
    this.router.navigate(['/teams', teamId]);
  }

  editTeam(team: Team): void {
    this.router.navigate(['/teams', team.id, 'edit']);
  }

  setActiveTab(tab: 'all-teams' | 'my-teams'): void {
    this.activeTab = tab;
    // Update URL with the filter parameter without reloading the page
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: tab === 'my-teams' ? 'my-teams' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  canManageTeam(team: Team): boolean {
    const userRole = this.getTeamRole(team);
    return userRole === 'leader' || userRole === 'admin';
  }

  getTeamRole(team: Team): string | null {
    const member = team.usersIncludes?.find(
      (m) =>
        // In a real app, you'd compare with the current user's ID
        // For now, we're assuming any role indicates the current user
        m.role === 'leader' || m.role === 'admin' || m.role === 'member'
    );
    return member?.role || null;
  }

  confirmDeleteTeam(team: Team): void {
    this.teamToDelete = team;
    this.isDeleteModalVisible = true;
  }

  handleDeleteCancel(): void {
    this.isDeleteModalVisible = false;
    this.teamToDelete = null;
  }

  handleDeleteOk(): void {
    if (!this.teamToDelete) return;

    this.deleteLoading = true;
    const teamId = this.teamToDelete.id;
    const teamName = this.teamToDelete.name;

    this.teamService
      .deleteTeam(teamId)
      .pipe(
        finalize(() => {
          this.deleteLoading = false;
          this.isDeleteModalVisible = false;
          this.teamToDelete = null;
        })
      )
      .subscribe({
        next: () => {
          this.message.success(`Team "${teamName}" has been deleted`);
          // Remove the deleted team from the lists
          this.teams = this.teams.filter((t) => t.id !== teamId);
          this.myTeams = this.myTeams.filter((t) => t.id !== teamId);
          this.applySearch();
        },
        error: (err) => {
          this.message.error(
            `Failed to delete team: ${err.message || 'Unknown error'}`
          );
          console.error('Failed to delete team', err);
        },
      });
  }
}
