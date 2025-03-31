import { Component, EventEmitter, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Card } from '../../../../../core/models';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SvgIconComponent } from '../../../../../shared/components';
import { TextareaSubmitOnEnterDirective } from '../../../../../shared/directives/textarea-submit-on-enter.directive';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { DismissOnEscapeDirective } from '../../../../../shared/directives/dismiss-on-escape.directive';

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
  @Output() createCard: EventEmitter<Card> = new EventEmitter<Card>();

  cardTypes = [
    {
      label: 'TASK',
      icon: 'blueCheck',
    },
    {
      label: 'BUG',
      icon: 'bug',
    },
    {
      label: 'STORY',
      icon: 'story',
    },
  ];
  editMode = false;

  createCardForm!: FormGroup;

  get type() {
    return this.createCardForm.get('type');
  }

  constructor() {
    this.createCardForm = new FormGroup({
      title: new FormControl('', [Validators.required]),
      type: new FormControl(this.cardTypes[0].label),
    });
  }

  onSubmit(): void {
    console.log('Submitting form:', this.createCardForm.value);
    if (this.createCardForm.valid) {
      this.createCard.emit(this.createCardForm.value);
      this.createCardForm.reset({
        title: '',
        type: this.cardTypes[0].label,
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
