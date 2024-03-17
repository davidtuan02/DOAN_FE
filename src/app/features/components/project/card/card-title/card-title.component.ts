import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InlineInputControlsModule, SvgIconComponent } from '../../../../../shared/components';

@Component({
  selector: 'app-card-title',
  standalone: true,
  imports: [ReactiveFormsModule, InlineInputControlsModule, SvgIconComponent],
  templateUrl: './card-title.component.html',
  styleUrls: ['./card-title.component.scss']
})
export class CardTitleComponent implements OnChanges {
  @Input() title: string = '';
  @Input() cardId: string = '';
  @Output() onUpdateTitle = new EventEmitter();

  titleControl!: FormControl;

  constructor() {
    this.titleControl = new FormControl('');
  }

  ngOnChanges(changes: SimpleChanges): void {
    const title = changes['title'];
    if (title.currentValue !== title.previousValue) {
      this.titleControl.patchValue(this.title);
    }
  }

  onSubmit(): void {
    this.onUpdateTitle.emit({
      id: this.cardId,
      title: this.titleControl.value
    });
  }

  onCancel(): void {
    this.titleControl.patchValue(this.title);

    this.onUpdateTitle.emit({
      id: this.cardId,
      title: this.title
    });
  }
}
