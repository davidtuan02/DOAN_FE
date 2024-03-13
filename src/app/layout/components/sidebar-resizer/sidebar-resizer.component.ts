import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SvgIconComponent } from '../../../shared/components';

@Component({
  selector: 'app-sidebar-resizer',
  standalone: true,
  imports: [CommonModule, SvgIconComponent],
  templateUrl: './sidebar-resizer.component.html',
  styleUrls: ['./sidebar-resizer.component.scss']
})
export class SidebarResizerComponent {
  @Input() collapsed: boolean = true;
  @Output() onToggleSidebar: EventEmitter<any> = new EventEmitter();

  focused: boolean = false;

  onToggle(): void {
    this.onToggleSidebar.emit();
  }

  onHoverResizer(hovered: any): void {
    this.focused = hovered;
  }
}
