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
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { TeamPermissionGuard } from './core/guards/team-permission.guard';
import { TaskOwnershipGuard } from './core/guards/task-ownership.guard';
import { YourWorkComponent } from './features/components/your-work/your-work.component';
import { PermissionType } from './core/services/team-permissions.service';

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
        canActivate: [AdminGuard],
        data: { isStandalone: true },
      },
      {
        path: ':id',
        component: TeamDetailComponent,
        title: 'Team Details',
      },
      {
        path: ':id/edit',
        component: TeamFormComponent,
        title: 'Edit Team',
        canActivate: [TeamPermissionGuard],
        data: {
          isStandalone: true,
          requiredPermission: PermissionType.MANAGE_TEAM,
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
        canActivate: [TeamPermissionGuard],
        data: { requiredPermission: PermissionType.MANAGE_PROJECT },
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
        canActivate: [TeamPermissionGuard],
        data: { requiredPermission: PermissionType.MANAGE_PROJECT },
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/error?reason=NavError',
  },
];
