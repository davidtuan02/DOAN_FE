import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Import pipes and directives
import { PipesModule } from './pipes/pipes.module';

// Import ng-zorro modules
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    PipesModule,
    NzDropDownModule,
    NzModalModule,
    NzMessageModule,
    NzToolTipModule,
    NzSkeletonModule,
    NzEmptyModule,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    PipesModule,
    NzDropDownModule,
    NzModalModule,
    NzMessageModule,
    NzToolTipModule,
    NzSkeletonModule,
    NzEmptyModule,
  ],
})
export class SharedModule {}
