import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { TeamListComponent } from './team-list/team-list.component';
import { TeamDetailComponent } from './team-detail/team-detail.component';
import { TeamFormComponent } from './team-form/team-form.component';
import { TeamMembersComponent } from './team-members/team-members.component';
import { TeamProjectsComponent } from './team-projects/team-projects.component';

import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@NgModule({
  declarations: [
    TeamListComponent,
    TeamDetailComponent,
    TeamFormComponent,
    TeamMembersComponent,
    TeamProjectsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    NzDropDownModule,
    NzModalModule,
    NzMessageModule,
    NzToolTipModule,
    NzSkeletonModule,
    NzEmptyModule,
  ],
  exports: [
    TeamListComponent,
    TeamDetailComponent,
    TeamFormComponent,
    TeamMembersComponent,
    TeamProjectsComponent,
  ],
})
export class TeamModule {}
