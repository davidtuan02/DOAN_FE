import { Component, Input, OnInit } from '@angular/core';
import { CommentUser } from '../../../../../core/models';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../../../../../shared/components';

@Component({
  selector: 'app-comment-list-item',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './comment-list-item.component.html',
})
export class CommentListItemComponent {
  @Input() comment!: CommentUser;
}
