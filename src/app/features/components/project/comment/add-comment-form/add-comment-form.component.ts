import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../../../../core/models';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../../../../../shared/components';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-add-comment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AvatarComponent,
    RichTextEditorComponent,
  ],
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

  ngOnInit(): void {}

  onAddComment(): void {
    // Kiểm tra nội dung có rỗng không
    const commentContent = this.commentForm.value.comment;
    if (
      !commentContent ||
      commentContent.trim() === '' ||
      commentContent === '<p></p>'
    ) {
      // Nếu rỗng, không gửi comment
      return;
    }

    this.editMode = false;

    this.addComment.emit({
      content: commentContent,
      uid: this.user?.id,
    });

    // Reset form sau khi gửi
    this.commentForm.reset();
  }

  onFocus(): void {
    this.editMode = true;
  }

  onCancel(): void {
    this.editMode = false;
    this.commentForm.reset();
  }
}
