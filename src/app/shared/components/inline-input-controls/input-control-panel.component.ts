import {
  Component,
  Output,
  TemplateRef,
  ViewChild,
  EventEmitter
} from '@angular/core';
import { ControlPanel } from './inline-input-controls.directive';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-control-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-template>
      <div (click)="closed.emit()" class="input-control-panel-container">
        <ng-content></ng-content>
      </div>
    </ng-template>`,
  styleUrls: ['./input-control-panel.component.scss'],
})
export class InputControlPanelComponent implements ControlPanel {
  @ViewChild(TemplateRef) templateRef!: TemplateRef<any>;
  @Output() closed = new EventEmitter<void>();

  constructor() {
  }
}
