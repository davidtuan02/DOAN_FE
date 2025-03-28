import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Observable } from 'rxjs';
import * as fromStore from './core/store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NzSpinModule, RouterOutlet, AsyncPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  loading$: Observable<boolean>;

  constructor(private store: Store<fromStore.AppState>) {
    this.loading$ = this.store.pipe(select(fromStore.selectCardsLoading));
  }

  ngOnInit(): void {}
}
