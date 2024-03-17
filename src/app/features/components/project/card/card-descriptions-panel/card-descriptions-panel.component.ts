import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Card, PartialCard } from '../../../../../core/models';
import { CommonModule } from '@angular/common';
import { CardTitleComponent } from '../card-title/card-title.component';
import { SvgIconComponent } from '../../../../../shared/components';
import { CardDescriptionComponent } from '../card-description/card-description.component';
import { CardEnvironmentComponent } from '../card-environment/card-environment.component';
import { CardActivityComponent } from '../card-activity/card-activity.component';
import * as fromStore from '../../../../../core/store';
import { Store, select } from '@ngrx/store';

@Component({
  selector: 'app-card-descriptions-panel',
  standalone: true,
  imports: [CommonModule, CardTitleComponent, SvgIconComponent, CardDescriptionComponent, CardEnvironmentComponent, CardActivityComponent],
  templateUrl: './card-descriptions-panel.component.html',
})
export class CardDescriptionsPanelComponent implements OnInit {
  selectedCard$!: Observable<Card | undefined | null>;

  constructor(private store: Store<fromStore.AppState>) {
  }

  ngOnInit(): void {
    this.selectedCard$ = this.store.pipe(select(fromStore.selectSelectedCard));
  }

  onUpdateCard(partial: PartialCard): void {
    this.store.dispatch(fromStore.updateCard({ partial }));
  }
}
