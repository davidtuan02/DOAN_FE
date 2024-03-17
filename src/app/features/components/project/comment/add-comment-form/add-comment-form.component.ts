import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../../../../core/models';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../../../../../shared/components';

@Component({
  selector: 'app-add-comment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvatarComponent],
  templateUrl: './add-comment-form.component.html',
})
export class AddCommentFormComponent implements OnInit {
  @Input() user!: User | null;

  @Output() addComment = new EventEmitter();

  editMode = false;

  commentForm: FormGroup;

  constructor() {
    this.commentForm = new FormGroup({
      comment: new FormControl(''),
    });
  }

  ngOnInit(): void {
  }

  onAddComment(): void {
    this.editMode = false;

    this.addComment.emit({
      content: this.commentForm.value.comment,
      uid: this.user?.id
    });

    this.commentForm.reset();
  }

}
