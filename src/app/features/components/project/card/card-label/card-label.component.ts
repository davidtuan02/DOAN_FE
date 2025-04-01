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
import { NzTagModule } from 'ng-zorro-antd/tag';

@Destroyable()
@Component({
  selector: 'app-card-label',
  standalone: true,
  imports: [
    CommonModule,
    NzSelectModule,
    ReactiveFormsModule,
    SvgIconComponent,
    NzTagModule,
  ],
  templateUrl: './card-label.component.html',
})
export class CardLabelComponent implements OnInit, OnChanges {
  @Input() labels: Array<string> = [];
  @Input() availableLabels: Array<string> | null = [];
  @Input() cardId!: string;

  @Output() updateLabels = new EventEmitter();

  labelsControl: FormControl;
  loading = false;
  private lastLabelsHash: string = '';

  constructor() {
    this.labelsControl = new FormControl([]);
  }

  ngOnInit(): void {
    this.labelsControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => {
          // Compare arrays by converting to sorted JSON strings
          const prevHash = this.getLabelsHash(prev || []);
          const currHash = this.getLabelsHash(curr || []);
          return prevHash === currHash;
        }),
        takeUntilDestroyed(this),
        tap((values) => {
          const newLabelsHash = this.getLabelsHash(values || []);
          if (this.lastLabelsHash === newLabelsHash) {
            return; // No change, don't emit
          }

          this.loading = true;
          console.log('Updating labels to:', values);
          this.lastLabelsHash = newLabelsHash;

          this.updateLabels.emit({
            id: this.cardId,
            labels: values,
          });
          this.loading = false;
        })
      )
      .subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const labels = changes['labels'];

    if (labels && labels.previousValue !== labels.currentValue) {
      console.log('Labels changed to:', this.labels);
      this.lastLabelsHash = this.getLabelsHash(this.labels || []);
      this.labelsControl.patchValue(this.labels || [], { emitEvent: false });
    }
  }

  getBackgroundColorForLabel(label: string): string {
    // Simple function to generate consistent colors for labels
    const labelColors: { [key: string]: string } = {
      bug: '#FF5630',
      feature: '#4C9AFF',
      improvement: '#00C7E6',
      documentation: '#6554C0',
      task: '#36B37E',
      question: '#F19E39',
      epic: '#6554C0',
      story: '#00C7E6',
      high: '#FF5630',
      medium: '#FFAB00',
      low: '#36B37E',
    };

    // If we have a predefined color for this label, use it
    const lowerLabel = label.toLowerCase();
    for (const key of Object.keys(labelColors)) {
      if (lowerLabel.includes(key)) {
        return labelColors[key];
      }
    }

    // Otherwise, generate a color based on the label string
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 50%)`;
  }

  removeLabel(label: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const currentLabels = [...(this.labelsControl.value || [])];
    const index = currentLabels.indexOf(label);

    if (index !== -1) {
      currentLabels.splice(index, 1);
      this.labelsControl.setValue(currentLabels);
    }
  }

  // Helper method to get a hash of labels array for comparison
  private getLabelsHash(labels: string[]): string {
    return JSON.stringify([...labels].sort());
  }
}
