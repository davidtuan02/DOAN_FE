import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
} from '@angular/core';
import { NgModelComponent } from '../../../core/abstracts';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent extends NgModelComponent {
  @Input()
  inputType: 'text' | 'password' | 'email' = 'text';

  @Input()
  inputPlaceholder = '';

  @Input()
  inputLabel = '';

  @Input()
  inputId = '';

  @Input()
  inputClass = '';

  @Input()
  containerClass = '';

  @Input()
  override disabled = false;

  @Input()
  required = '';

  @Input()
  invalidMessage = '';

  @Output()
  onEnter = new EventEmitter();
}
