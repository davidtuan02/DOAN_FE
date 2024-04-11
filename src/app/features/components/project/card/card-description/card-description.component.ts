import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PartialCard } from '../../../../../core/models';
import { CommonModule } from '@angular/common';
import { RichTextEditorComponent } from '../../../../../shared/components';
import { QuillViewComponent } from 'ngx-quill';

@Component({
  selector: 'app-card-description',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RichTextEditorComponent, QuillViewComponent],
  templateUrl: './card-description.component.html',
})
export class CardDescriptionComponent implements OnChanges {
  @Input() description: string = '';
  @Input() cardId!: string;

  @Output() updateDescription = new EventEmitter();

  editMode = false;

  descriptionForm: FormGroup;

  constructor() {
    this.descriptionForm = new FormGroup({
      description: new FormControl(''),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const description = changes['description'];
    if (description && description.currentValue !== description.previousValue) {
      this.descriptionForm.patchValue({
        description: this.description,
      });
    }
  }

  onUpdateDescription(): void {
    this.editMode = false;
    const partial: PartialCard = {
      id: this.cardId,
      description: this.descriptionForm.value.description
    };

    this.updateDescription.emit(partial);
  }
}
