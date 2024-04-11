import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PartialCard } from '../../../../../core/models';
import { RichTextEditorComponent } from '../../../../../shared/components';
import { QuillModule } from 'ngx-quill';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-environment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RichTextEditorComponent, QuillModule],
  templateUrl: './card-environment.component.html',
})
export class CardEnvironmentComponent {
  @Input() environment: string = '';
  @Input() cardId!: string;

  @Output() updateCardEnvironment = new EventEmitter();

  editMode = false;

  envForm: FormGroup;

  constructor() {
    this.envForm = new FormGroup({
      environment: new FormControl(''),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const environment = changes['environment'];
    if (environment && environment.currentValue !== environment.previousValue) {
      this.envForm.patchValue({
        environment: this.environment,
      });
    }
  }

  onUpdateEnvironment(): void {
    this.editMode = false;
    const partial: PartialCard = {
      id: this.cardId,
      environment: this.envForm.value.environment
    };

    this.updateCardEnvironment.emit(partial);
  }
}
