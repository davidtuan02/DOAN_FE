import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
} from '@angular/core';

@Directive({
  selector: '[appTextareaSubmitOnEnter]',
  standalone: true,
})
export class TextareaSubmitOnEnterDirective {
  @Output() onSubmit = new EventEmitter<void>();

  constructor(private el: ElementRef) {}

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Kiểm tra nếu nhấn Enter mà không nhấn Shift
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit.emit();
    }
  }
}
