import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { User, AddCommentModel, CommentUser } from '../../../../../core/models';
import { ActivityViewMode } from '../../../../../core/constants';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { tap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { CardActivityLabelsComponent } from '../card-activity-labels/card-activity-labels.component';
import { SvgIconComponent } from '../../../../../shared/components';
import { CommentListComponent } from '../../comment/comment-list/comment-list.component';
import * as fromStore from '../../../../../core/store';
import { Store, select } from '@ngrx/store';

@Destroyable()
@Component({
  selector: 'app-card-activity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardActivityLabelsComponent, SvgIconComponent, CommentListComponent],
  templateUrl: './card-activity.component.html',
})
export class CardActivityComponent implements OnInit {
  currentUser$!: Observable<User>;
  comments$!: Observable<Array<CommentUser>>;

  activityLabelControl!: FormControl;

  currentActivityTab: ActivityViewMode = 'comments';

  constructor(private store: Store<fromStore.AppState>) {
    this.activityLabelControl = new FormControl(this.currentActivityTab);
  }

  ngOnInit(): void {
    this.comments$ = this.store.pipe(select(fromStore.allCommentsWithUser));
    this.currentUser$ = this.store.pipe(select(fromStore.selectCurrentUser));

    this.activityLabelControl.valueChanges.pipe(
      takeUntilDestroyed(this),
      tap(value => (this.currentActivityTab = value))
    ).subscribe();
  }

  onAddComment(comment: AddCommentModel): void {
    this.store.dispatch(fromStore.addComment({ comment }));
  }
}
