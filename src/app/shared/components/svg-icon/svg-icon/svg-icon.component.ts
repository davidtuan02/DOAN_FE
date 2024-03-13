import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-svg-icon',
  standalone: true,
  templateUrl: './svg-icon.component.html'
})
export class SvgIconComponent {
  @Input() name: string = 'default';
  @Input() fill = 'currentColor';
  @Input() width = 16;
  @Input() height = 16;
  window: any = window;

  get iconUrl() {
    return `${this.window.location.href}#${this.name}`;
  }
}
