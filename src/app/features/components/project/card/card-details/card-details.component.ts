import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Card, Column } from '../../../../../core/models';
import { Destroyable } from '../../../../../shared/utils';
import { CardTypesEnum } from '../../../../../core/enums';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from '../../../../../shared/components';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { CardDescriptionsPanelComponent } from '../card-descriptions-panel/card-descriptions-panel.component';
import { CardDetailsPanelComponent } from '../card-details-panel/card-details-panel.component';
import { NzDividerComponent } from 'ng-zorro-antd/divider';
import { CardDetailsLoaderComponent } from '../card-details-loader/card-details-loader.component';
import * as fromStore from '../../../../../core/store';
import { Store, select } from '@ngrx/store';

@Destroyable()
@Component({
  selector: 'app-card-details',
  standalone: true,
  imports: [
    CommonModule, 
    NzPopoverModule, 
    SvgIconComponent, 
    CardDescriptionsPanelComponent, 
    CardDetailsPanelComponent, 
    NzDividerComponent, 
    CardDetailsLoaderComponent
  ],
  templateUrl: './card-details.component.html',
  styleUrls: ['./card-details.component.scss']
})
export class CardDetailsComponent implements OnInit {
  columns$!: Observable<Array<Column>>;
  selectedCard$!: Observable<Card | undefined | null>;

  CardTypes = CardTypesEnum;

  contextMenuVisible: boolean = false;

  constructor(private store: Store<fromStore.AppState>, private router: Router) {
  }

  ngOnInit(): void {
    this.selectedCard$ = this.store.pipe(select(fromStore.selectSelectedCard));
    this.columns$ = this.store.pipe(select(fromStore.allColumns));
  }

  onCloseModal(): void {
    this.router.navigate(['/board']);
  }

  onContextMenuClick(): void {
    this.contextMenuVisible = false;
  }
}
