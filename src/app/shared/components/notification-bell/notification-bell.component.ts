import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { NotificationListComponent } from '../notification-list/notification-list.component';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationListComponent],
  template: `
    <div class="relative">
      <button
        class="p-2 rounded-full hover:bg-gray-100 focus:outline-none flex items-center justify-center"
        (click)="toggleNotifications()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <!-- Notification Badge -->
        <span
          *ngIf="unreadCount > 0"
          class="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white flex items-center justify-center min-w-[18px] min-h-[18px]"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- Dropdown List -->
      <app-notification-list *ngIf="isOpen" (close)="isOpen = false">
      </app-notification-list>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class NotificationBellComponent implements OnInit {
  unreadCount = 0;
  isOpen = false;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadCount = count;
    });

    // Initial load
    this.notificationService.getUnreadCount().subscribe();
  }

  toggleNotifications(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      // Load notifications when opening the dropdown
      this.notificationService.getNotifications().subscribe();
    }
  }
}
