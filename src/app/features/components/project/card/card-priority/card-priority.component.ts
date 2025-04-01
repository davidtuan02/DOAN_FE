import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Destroyable, takeUntilDestroyed } from '../../../../../shared/utils';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SvgIconComponent } from '../../../../../shared/components';

@Destroyable()
@Component({
  selector: 'app-card-priority',
  standalone: true,
  imports: [
    CommonModule,
    NzSelectModule,
    ReactiveFormsModule,
    SvgIconComponent,
  ],
  templateUrl: './card-priority.component.html',
})
export class CardPriorityComponent implements OnInit, OnChanges {
  @Input() priority!: string | null;
  @Input() cardId!: string;

  @Output() updatePriority = new EventEmitter();

  priorityControl: FormControl;
  loading = false;
  private lastPriority: string | null = null;

  // Priority options with icons
  priorities = [
    { label: 'Highest', value: 'Highest', iconName: 'highest' },
    { label: 'High', value: 'High', iconName: 'high' },
    { label: 'Medium', value: 'Medium', iconName: 'medium' },
    { label: 'Low', value: 'Low', iconName: 'low' },
    { label: 'Lowest', value: 'Lowest', iconName: 'lowest' },
  ];

  constructor() {
    this.priorityControl = new FormControl(null);
  }

  ngOnInit(): void {
    this.priorityControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this),
        tap((value) => {
          if (this.lastPriority === value) {
            return; // No change, don't emit
          }

          this.loading = true;
          console.log('Updating priority to:', value);
          this.lastPriority = value;

          this.updatePriority.emit({
            id: this.cardId,
            priority: value,
          });
          this.loading = false;
        })
      )
      .subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const priority = changes['priority'];

    if (
      priority &&
      priority.previousValue !== priority.currentValue &&
      this.priority
    ) {
      console.log('Priority changed to:', this.priority);
      const normalizedPriority = this.normalizePriority(this.priority);
      this.lastPriority = normalizedPriority;
      this.priorityControl.patchValue(normalizedPriority, { emitEvent: false });
    }
  }

  // Helper method to get the icon for the current priority
  getPriorityIcon(): string {
    if (!this.priority) return 'medium';
    const normalizedPriority = this.normalizePriority(this.priority);
    const found = this.priorities.find((p) => p.value === normalizedPriority);
    return found?.iconName || 'medium';
  }

  // Normalize priority string to match the expected format
  private normalizePriority(priority: string): string {
    priority = priority.trim();

    // Handle case insensitivity
    const lowerCase = priority.toLowerCase();

    if (
      lowerCase === 'highest' ||
      lowerCase === 'high' ||
      lowerCase === 'medium' ||
      lowerCase === 'low' ||
      lowerCase === 'lowest'
    ) {
      return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    }

    // Handle potential backend values
    if (lowerCase === 'highest' || lowerCase === 'high') return 'Highest';
    if (lowerCase === 'high' || lowerCase === 'high') return 'High';
    if (lowerCase === 'medium' || lowerCase === 'normal') return 'Medium';
    if (lowerCase === 'low') return 'Low';
    if (lowerCase === 'lowest') return 'Lowest';

    // Default
    return 'Medium';
  }
}
