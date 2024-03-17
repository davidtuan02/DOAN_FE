import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { CardFilter } from '../../../../../core/models/card/card-filter';
import { BoardComponent } from '../board/board.component';
import { BoardHeadingComponent } from '../board-heading/board-heading.component';
import { BoardActionComponent } from '../board-action/board-action.component';
import { AsyncPipe } from '@angular/common';
import * as fromStore from '../../../../../core/store';
import { Store, select } from '@ngrx/store';

@Component({
  selector: 'app-column-container',
  standalone: true,
  imports: [BoardComponent, BoardHeadingComponent, BoardActionComponent, AsyncPipe],
  templateUrl: './board-container.component.html',
  styleUrls: ['./board-container.component.scss']
})
export class BoardContainerComponent implements OnInit {
  clearFiltersVisible$!: Observable<boolean>;

  constructor(private store: Store<fromStore.AppState>) {
  }

  ngOnInit(): void {
    this.clearFiltersVisible$ = this.store.pipe(select(fromStore.clearFilterVisible));
  }

  updateCardFilters(filters: CardFilter): void {
    this.store.dispatch(fromStore.updateCardFilters({ filters }));
  }
}
