import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { User, AddCommentModel, CommentUser } from '../../../../../core/models';
import { ActivityViewMode } from '../../../../../core/constants';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { catchError, tap } from 'rxjs/operators';
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
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardActivityLabelsComponent,
    SvgIconComponent,
    CommentListComponent,
  ],
  templateUrl: './card-activity.component.html',
})
export class CardActivityComponent implements OnInit {
  currentUser$!: Observable<User | null>;
  comments$!: Observable<Array<CommentUser>>;
  error: string | null = null;

  activityLabelControl!: FormControl;

  currentActivityTab: ActivityViewMode = 'comments';

  constructor(private store: Store<fromStore.AppState>) {
    this.activityLabelControl = new FormControl(this.currentActivityTab);
  }

  ngOnInit(): void {
    this.comments$ = this.store.pipe(
      select(fromStore.allCommentsWithUser),
      catchError((err) => {
        this.error = 'Failed to load comments';
        console.error('Error loading comments:', err);
        return of([]);
      })
    );

    this.currentUser$ = this.store.pipe(
      select(fromStore.selectCurrentUser),
      catchError((err) => {
        console.error('Error loading current user:', err);
        return of(null);
      })
    );

    this.activityLabelControl.valueChanges
      .pipe(
        takeUntilDestroyed(this),
        tap((value) => (this.currentActivityTab = value))
      )
      .subscribe();

    // Lắng nghe lỗi khi thêm comment
    this.store
      .pipe(
        select(fromStore.selectCardError),
        takeUntilDestroyed(this),
        tap((error) => {
          if (error && error.includes('comment')) {
            this.error = error;
            setTimeout(() => {
              this.error = null;
            }, 3000);
          }
        })
      )
      .subscribe();
  }

  onAddComment(comment: AddCommentModel): void {
    this.error = null;
    if (
      !comment.content ||
      comment.content.trim() === '' ||
      comment.content === '<p></p>' ||
      comment.content === '<p><br></p>'
    ) {
      this.error = 'Comment cannot be empty';
      setTimeout(() => {
        this.error = null;
      }, 3000);
      return;
    }

    this.store.dispatch(fromStore.addComment({ comment }));
  }
}
