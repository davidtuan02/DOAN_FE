import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../core/models';
import { CommonModule } from '@angular/common';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule, NzToolTipModule],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent {
  @Input() user!: User | null;
  @Input() size: number = 32;
  @Input() bordered: boolean = false;
  @Input() selected: boolean | undefined = false;
  @Input() showTooltip: boolean = true;

  @Output() select = new EventEmitter();

  onSelect(): void {
    this.select.emit(this.user?.id);
  }

  getUserInitials(): string {
    if (!this.user) return '';

    // Try to get initials from firstName and lastName
    if (this.user.firstName && this.user.lastName) {
      return (
        this.user.firstName.charAt(0) + this.user.lastName.charAt(0)
      ).toUpperCase();
    }

    // If no firstName/lastName, use first 2 chars from username
    if (this.user.username) {
      return this.user.username.substring(0, 2).toUpperCase();
    }

    // Fallback to email if available
    if (this.user.email) {
      return this.user.email.substring(0, 2).toUpperCase();
    }

    return 'U'; // Ultimate fallback
  }

  getFullName(): string {
    if (!this.user) return '';

    if (this.user.firstName && this.user.lastName) {
      return `${this.user.firstName} ${this.user.lastName}`;
    }

    return this.user.username || this.user.email || 'Unknown User';
  }
}
