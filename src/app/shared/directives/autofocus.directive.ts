import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[appAutofocus]',
  standalone: true,
})
export class AutofocusDirective implements AfterViewInit {
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    // Đặt timeout ngắn để đảm bảo element đã được render
    setTimeout(() => {
      this.el.nativeElement.focus();
    }, 0);
  }
}
