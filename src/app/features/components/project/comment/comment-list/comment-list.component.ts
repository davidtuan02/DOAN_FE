import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User, AddCommentModel, CommentUser } from '../../../../../core/models';
import { CommonModule } from '@angular/common';
import { CommentListItemComponent } from '../comment-list-item/comment-list-item.component';
import { AddCommentFormComponent } from '../add-comment-form/add-comment-form.component';

@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [CommonModule, CommentListItemComponent, AddCommentFormComponent],
  templateUrl: './comment-list.component.html',
})
export class CommentListComponent{
  @Input() comments: Array<CommentUser> | null = [];
  @Input() currentUser!: User | null;

  @Output() addComment = new EventEmitter();

  onAddComment(comment: AddCommentModel): void {
    this.addComment.emit(comment);
  }

}
