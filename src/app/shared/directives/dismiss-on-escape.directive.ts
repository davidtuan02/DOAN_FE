import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[dismissOnEscape]',
  standalone: true,
})
export class DismissOnEscapeDirective {
  @Output() onDismiss = new EventEmitter<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler() {
    this.onDismiss.emit();
  }
}
