import { Component, Input, OnInit } from '@angular/core';
import { User } from '../../../core/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="avatar-container"
      [ngClass]="getSizeClass()"
      [ngStyle]="getCustomSizeStyle()"
    >
      <ng-container *ngIf="hasImage(); else initialTemplate">
        <img [src]="getAvatarUrl()" [alt]="getName()" class="avatar-image" />
      </ng-container>
      <ng-template #initialTemplate>
        <div
          class="avatar-initials"
          [style.background-color]="getBackgroundColor()"
        >
          {{ getInitials() }}
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .avatar-container {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        overflow: hidden;
      }

      .avatar-size-small {
        width: 24px;
        height: 24px;
      }

      .avatar-size-medium {
        width: 32px;
        height: 32px;
      }

      .avatar-size-large {
        width: 40px;
        height: 40px;
      }

      .avatar-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-initials {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 500;
        font-size: 0.75rem;
      }
    `,
  ],
})
export class AvatarComponent implements OnInit {
  @Input() user?: User;
  @Input() avatarUrl?: string;
  @Input() name?: string;
  @Input() size: 'small' | 'medium' | 'large' | number = 'medium';
  @Input() backgroundColor?: string;

  constructor() {}

  ngOnInit(): void {}

  getAvatarUrl(): string {
    if (this.avatarUrl) {
      return this.avatarUrl;
    }

    if (this.user?.avatar) {
      return this.user.avatar;
    }

    if (this.name || this.user) {
      // Generate avatar from name using UI Avatars API
      const nameForAvatar = this.name || this.getUserFullName() || '?';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        nameForAvatar
      )}&background=6554C0&color=fff`;
    }

    return '';
  }

  getName(): string {
    return this.name || this.getUserFullName() || 'User';
  }

  getUserFullName(): string {
    if (!this.user) return '';
    return `${this.user.firstName} ${this.user.lastName}`.trim();
  }

  getInitials(): string {
    const name = this.getName();

    if (!name || name === 'User') return '?';

    if (this.user) {
      return (
        this.user.firstName.charAt(0) + this.user.lastName.charAt(0)
      ).toUpperCase();
    }

    const parts = name.split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  hasImage(): boolean {
    return !!(this.avatarUrl || this.user?.avatar);
  }

  getSizeClass(): string {
    if (typeof this.size === 'number') {
      return '';
    }
    return `avatar-size-${this.size}`;
  }

  getCustomSizeStyle(): { [key: string]: string } {
    if (typeof this.size === 'number') {
      return {
        width: `${this.size}px`,
        height: `${this.size}px`,
      };
    }
    return {};
  }

  getBackgroundColor(): string {
    return this.backgroundColor || '#6554C0';
  }
}
