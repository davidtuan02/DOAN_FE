import {
  Component,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  Notification,
  NotificationService,
  NotificationType,
} from '../../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="fixed top-[60px] right-[12px] sm:absolute sm:top-auto sm:right-0 sm:mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 max-h-[400px] flex flex-col border border-gray-200"
    >
      <div
        class="px-4 py-3 border-b border-gray-200 flex justify-between items-center"
      >
        <h3 class="text-lg font-semibold text-gray-800">Notifications</h3>
        <button
          *ngIf="notifications.length > 0"
          (click)="markAllAsRead()"
          class="text-sm text-blue-600 hover:underline"
        >
          Mark all as read
        </button>
      </div>

      <!-- Loading Indicator -->
      <div *ngIf="isLoading" class="p-4 text-center">
        <div
          class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"
        ></div>
        <p class="mt-2 text-sm text-gray-500">Loading notifications...</p>
      </div>

      <!-- Error Message -->
      <div *ngIf="error && !isLoading" class="p-4 text-center bg-red-50">
        <p class="text-sm text-red-600">{{ error }}</p>
        <button
          (click)="retryLoadNotifications()"
          class="mt-2 text-sm text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>

      <!-- Notification List -->
      <div *ngIf="!isLoading && !error" class="overflow-y-auto" style="max-height: 400px;">
        <ng-container *ngIf="notifications.length > 0; else emptyState">
          <div
            *ngFor="let notification of notifications"
            [ngClass]="{ 'bg-blue-50': !notification.isRead }"
            class="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
          >
            <a
              [routerLink]="notification.link"
              (click)="onNotificationClick(notification)"
              class="block px-4 py-3"
            >
              <div class="flex items-start">
                <div
                  [ngClass]="getIconClass(notification.type)"
                  class="flex-shrink-0 rounded-full p-2 mr-3"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      [attr.d]="getIconPath(notification.type)"
                    />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ notification.title }}
                  </p>
                  <p class="text-sm text-gray-500 line-clamp-2">
                    {{ notification.message }}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ notification.createdAt | date : 'short' }}
                  </p>
                </div>
                <button
                  (click)="deleteNotification($event, notification.id)"
                  class="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </a>
          </div>
        </ng-container>

        <ng-template #emptyState>
          <div class="py-8 px-4 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-12 w-12 text-gray-400 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p class="text-gray-500">No notifications yet</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        z-index: 50;
      }
    `,
  ],
})
export class NotificationListComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  notifications: Notification[] = [];
  isLoading = false;
  error: string | null = null;

  private subscriptions = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Subscribe to notifications
    const notificationsSub = this.notificationService.notifications$.subscribe(
      (notifications) => {
        this.notifications = notifications;
      }
    );
    this.subscriptions.add(notificationsSub);

    // Subscribe to loading state
    const loadingSub = this.notificationService.isLoading$.subscribe(
      (isLoading) => {
        this.isLoading = isLoading;
      }
    );
    this.subscriptions.add(loadingSub);

    // Subscribe to error state
    const errorSub = this.notificationService.error$.subscribe((error) => {
      this.error = error;
    });
    this.subscriptions.add(errorSub);

    // Load notifications
    this.retryLoadNotifications();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Close when clicked outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const notificationList = target.closest('app-notification-list');

    // Check for bell button click
    const bellIcon = target.closest('app-svg-icon[name="bell"]');
    const bellButton = target.closest('button.circle-icon-button');

    // If the click is on the bell button or icon, don't close
    if (bellIcon || (bellButton && bellIcon)) {
      return;
    }

    if (!notificationList) {
      this.close.emit();
    }
  }

  retryLoadNotifications(): void {
    this.notificationService.getNotifications().subscribe();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Close the notification panel after clicking an item
    setTimeout(() => {
      this.close.emit();
    }, 300);
  }

  deleteNotification(event: MouseEvent, id: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.notificationService.deleteNotification(id).subscribe();
  }

  getIconClass(type: NotificationType): string {
    const baseClass = 'text-white ';

    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return baseClass + 'bg-purple-500';
      case NotificationType.TASK_UPDATED:
        return baseClass + 'bg-blue-500';
      case NotificationType.COMMENT_ADDED:
        return baseClass + 'bg-green-500';
      case NotificationType.MENTIONED:
        return baseClass + 'bg-yellow-500';
      case NotificationType.PROJECT_UPDATED:
        return baseClass + 'bg-orange-500';
      case NotificationType.SPRINT_STARTED:
        return baseClass + 'bg-teal-500';
      case NotificationType.SPRINT_ENDED:
        return baseClass + 'bg-red-500';
      default:
        return baseClass + 'bg-gray-500';
    }
  }

  getIconPath(type: NotificationType): string {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return 'M12 4v16m8-8H4';
      case NotificationType.TASK_UPDATED:
        return 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z';
      case NotificationType.COMMENT_ADDED:
        return 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z';
      case NotificationType.MENTIONED:
        return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
      case NotificationType.PROJECT_UPDATED:
        return 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10';
      case NotificationType.SPRINT_STARTED:
        return 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z';
      case NotificationType.SPRINT_ENDED:
        return 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }
}
