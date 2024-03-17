import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from '../../../core/models';
import { Destroyable, takeUntilDestroyed } from '../../../shared/utils';
import { CommonModule } from '@angular/common';
import { SvgIconComponent, AvatarComponent } from '../../../shared/components';
import { NzInputModule } from 'ng-zorro-antd/input';
import { Store, select } from '@ngrx/store';
import * as fromStore from '../../../core/store';	

@Destroyable()
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, SvgIconComponent, AvatarComponent, NzInputModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {
  currentUser$!: Observable<User>;

  topbarMenuItems = [
    { name: 'Your work', selected: false },
    { name: 'Projects', selected: true },
    { name: 'Filters', selected: false },
    { name: 'Dashboards', selected: false },
    { name: 'People', selected: false },
    { name: 'Plans', selected: false },
    { name: 'Apps', selected: false },
  ];

  displayTopbarMenuItems: Array<{ [key: string]: unknown }> = [];

  constructor(private store: Store<fromStore.AppState>, 
    private breakpointObserver: BreakpointObserver) {
  }

  ngOnInit(): void {
    this.currentUser$ = this.store.pipe(select(fromStore.selectCurrentUser));

    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
    ]).pipe(
      takeUntilDestroyed(this),
      tap(state => {
        if (state.breakpoints[Breakpoints.XSmall]) {
          this.displayTopbarMenuItems = this.topbarMenuItems.slice(0, 1);
        }
        if (state.breakpoints[Breakpoints.Small]) {
          this.displayTopbarMenuItems = this.topbarMenuItems.slice(0, 3);
        }
        if (state.breakpoints[Breakpoints.Medium]) {
          this.displayTopbarMenuItems = this.topbarMenuItems.slice(0, 5);
        }
        if (state.breakpoints[Breakpoints.Large]) {
          this.displayTopbarMenuItems = this.topbarMenuItems.slice(0, 7);
        }
      })
    ).subscribe();
  }
}
