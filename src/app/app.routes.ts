import { Routes } from '@angular/router';
import { ErrorComponent } from './shared/components';
import { LoginComponent } from './features/components';
import { LayoutComponent } from './layout/components';
import { ProfileComponent } from './features/components/user/profile/profile.component';
import { SummaryComponent } from './features/components/project/summary/summary.component';
import { ProjectSettingsComponent } from './features/components/project-settings/project-settings.component';
import { BacklogComponent } from './features/components/project/backlog/backlog.component';
import { ResetPasswordComponent } from './features/components/auth/reset-password/reset-password.component';
import { TeamListComponent } from './features/components/team/team-list/team-list.component';
import { TeamDetailComponent } from './features/components/team/team-detail/team-detail.component';
import { TeamFormComponent } from './features/components/team/team-form/team-form.component';
import { ProjectDetailComponent } from './features/components/project/project-detail/project-detail.component';
import { ProjectFormComponent } from './features/components/project/project-form/project-form.component';
import { ProjectsListComponent } from './features/components/project/projects-list/projects-list.component';
import { BoardContainerComponent } from './features/components/project/board/board-container/board-container.component';
import { AuthGuard, RoleGuard, TeamRoleGuard } from './core/guards';
import { YourWorkComponent } from './features/components/your-work/your-work.component';
import { UserRole } from './core/models/user/user';
import { IssuesPageComponent } from './features/components/project/issues/issues-page/issues-page.component';
import { FiltersComponent } from './features/components/filters/filters.component';
import { FilterDetailComponent } from './features/components/filters/filter-detail/filter-detail.component';
import { GoalsPageComponent } from './features/components/project/goals/goals-page/goals-page.component';
import { FormsComponent } from './features/forms/forms.component';
import { ProjectReportComponent } from './features/components/project/report/project-report.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'your-work',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
  },
  {
    path: 'your-work',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: YourWorkComponent,
        title: 'Your Work',
      },
    ],
  },
  {
    path: 'board',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: BoardContainerComponent,
        title: 'Board',
      },
    ],
  },
  {
    path: 'issues',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: IssuesPageComponent,
        title: 'Issues',
      },
      {
        path: ':id',
        component: BoardContainerComponent,
        title: 'Issue Details',
      },
    ],
  },
  {
    path: 'goals',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: GoalsPageComponent,
        title: 'Goals',
      },
    ],
  },
  {
    path: 'error',
    component: ErrorComponent,
  },
  {
    path: 'profile',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: ProfileComponent,
        title: 'Profile',
      },
    ],
  },
  {
    path: 'backlog',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: BacklogComponent,
        title: 'Backlog',
      },
    ],
  },
  {
    path: 'summary',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: SummaryComponent,
        title: 'Project Summary',
      },
    ],
  },
  {
    path: 'project-settings',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: ProjectSettingsComponent,
        title: 'Project Settings',
      },
      {
        path: ':id',
        component: ProjectSettingsComponent,
        title: 'Project Settings',
      },
    ],
  },
  {
    path: 'teams',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: TeamListComponent,
        title: 'Teams',
      },
      {
        path: 'new',
        component: TeamFormComponent,
        title: 'Create Team',
        canActivate: [RoleGuard],
        data: {
          isStandalone: true,
          role: UserRole.ADMIN,
        },
      },
      {
        path: ':id',
        component: TeamDetailComponent,
        title: 'Team Details',
        canActivate: [TeamRoleGuard],
        data: {
          teamPermission: 'canManageTeam',
        },
      },
      {
        path: ':id/edit',
        component: TeamFormComponent,
        title: 'Edit Team',
        canActivate: [TeamRoleGuard],
        data: {
          isStandalone: true,
          teamPermission: 'canManageTeam',
        },
      },
    ],
  },
  {
    path: 'projects',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: ProjectsListComponent,
        title: 'Projects',
      },
      {
        path: 'new',
        component: ProjectFormComponent,
        title: 'Create Project',
        canActivate: [TeamRoleGuard],
        data: {
          teamPermission: 'canManageProject',
        },
      },
      {
        path: ':id',
        component: ProjectDetailComponent,
        title: 'Project Details',
      },
      {
        path: ':id/edit',
        component: ProjectFormComponent,
        title: 'Edit Project',
        canActivate: [TeamRoleGuard],
        data: {
          teamPermission: 'canManageProject',
        },
      },
    ],
  },
  {
    path: 'filters',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: FiltersComponent,
        title: 'Filters',
      },
      {
        path: ':id',
        component: FilterDetailComponent,
        title: 'Filter Details',
      },
      {
        path: ':id/edit',
        component: FilterDetailComponent,
        title: 'Edit Filter',
        data: {
          isEdit: true,
        },
      },
    ],
  },
  {
    path: 'forms',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: ProjectReportComponent,
        title: 'Project Reports',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/error?reason=NavError',
  },
];
