import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appResizer]'
})
export class ResizerDirective {
  @Output() onHoverResizer: EventEmitter<boolean> = new EventEmitter();
  @Output() onToggleSidebar: EventEmitter<any> = new EventEmitter();

  @HostListener('mouseover') onMouseOver() {
    this.onHoverResizer.emit(true);
  }

  @HostListener('mouseout') onMouseOut() {
    this.onHoverResizer.emit(false);
  }

  @HostListener('click') onClick() {
    this.onToggleSidebar.emit();
  }
}
