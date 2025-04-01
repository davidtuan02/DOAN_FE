import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { User } from '../../../../../core/models';
import {
  AvatarComponent,
  SvgIconComponent,
} from '../../../../../shared/components';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-reporter',
  standalone: true,
  imports: [CommonModule, AvatarComponent, SvgIconComponent],
  templateUrl: './card-reporter.component.html',
})
export class CardReporterComponent implements OnChanges {
  @Input() reporter!: User | null | undefined;
  @Input() cardId!: string;

  ngOnChanges(changes: SimpleChanges): void {
    // Only track changes to reporter for future use if needed
    const reporter = changes['reporter'];
    if (reporter && reporter.previousValue !== reporter.currentValue) {
      console.log('Reporter changed:', this.reporter);
    }
  }
}
