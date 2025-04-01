import { Component, EventEmitter, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SvgIconComponent } from '../../../../../shared/components';
import { TextareaSubmitOnEnterDirective } from '../../../../../shared/directives/textarea-submit-on-enter.directive';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { DismissOnEscapeDirective } from '../../../../../shared/directives/dismiss-on-escape.directive';
import { Issue } from '../../../../../features/services/issue.service';
import { UserService } from '../../../../../core/services/user.service';

@Component({
  selector: 'app-create-card-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzSelectModule,
    SvgIconComponent,
    TextareaSubmitOnEnterDirective,
    AutofocusDirective,
    DismissOnEscapeDirective,
  ],
  templateUrl: './create-card-form.component.html',
  styleUrls: ['./create-card-form.component.scss'],
})
export class CreateCardFormComponent {
  @Output() createCard: EventEmitter<Partial<Issue>> = new EventEmitter<
    Partial<Issue>
  >();

  cardTypes = [
    {
      label: 'Task',
      icon: 'blueCheck',
    },
    {
      label: 'Bug',
      icon: 'bug',
    },
    {
      label: 'Story',
      icon: 'story',
    },
  ];
  editMode = false;

  createCardForm!: FormGroup;

  get type() {
    return this.createCardForm.get('type');
  }

  constructor(private userService: UserService) {
    this.createCardForm = new FormGroup({
      title: new FormControl('', [Validators.required]),
      type: new FormControl(this.cardTypes[0].label),
      priority: new FormControl('Medium'),
    });
  }

  onSubmit(): void {
    console.log('Submitting form:', this.createCardForm.value);
    if (this.createCardForm.valid) {
      const currentUserId = this.userService.getCurrentUserId();

      const cardData: Partial<Issue> = {
        title: this.createCardForm.value.title,
        type: this.createCardForm.value.type,
        priority: this.createCardForm.value.priority || 'Medium',
        status: 'To Do',
        storyPoints: 0, // Add default story points
      };

      this.createCard.emit(cardData);
      this.createCardForm.reset({
        title: '',
        type: this.cardTypes[0].label,
        priority: 'Medium',
      });
    }
    this.editMode = false;
  }

  onDismiss(): void {
    if (this.editMode) {
      this.editMode = false;
    }
  }
}
