import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, of, catchError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { BASE_URL } from '../core/constants/api.const';

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  MENTIONED = 'MENTIONED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  SPRINT_STARTED = 'SPRINT_STARTED',
  SPRINT_ENDED = 'SPRINT_ENDED',
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  userId: string;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = `${BASE_URL}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log(`NotificationService initialized with API URL: ${this.apiUrl}`);

    // Poll for new notifications every minute
    this.initPolling();

    // For development purposes only - load mock data if API is unavailable
    // We'll try real API first, then fall back to mock if needed
    if (location.hostname === 'localhost') {
      this.getNotifications()
        .pipe(
          catchError((error) => {
            console.warn(
              'Notification API unavailable, using mock data. Error:',
              error
            );
            this.loadMockNotifications();
            return of([]);
          })
        )
        .subscribe((data) => {
          if (data.length > 0) {
            console.log('Successfully loaded notifications from API');
          } else {
            console.log('No notifications found or using mock data');
          }
        });
    }
  }

  initPolling() {
    console.log('Starting notification polling');
    interval(60000) // 60 seconds
      .pipe(
        switchMap(() =>
          this.fetchUnreadCount().pipe(
            tap((result) => console.log('Polling unread count:', result)),
            catchError((error) => {
              console.error('Error polling unread count:', error);
              return of({ count: 0 });
            })
          )
        )
      )
      .subscribe();
  }

  private formatNotificationMessage(notification: Notification): string {
    if (!notification.message) return '';

    // Replace null with username if available
    if (notification.user?.username) {
      return notification.message.replace('null', notification.user.username);
    }

    return notification.message;
  }

  getNotifications(): Observable<Notification[]> {
    console.log('Fetching notifications from:', this.apiUrl);
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<Notification[]>(this.apiUrl).pipe(
      tap((notifications) => {
        console.log('Received notifications:', notifications);
        // Format messages before updating the subject
        const formattedNotifications = notifications.map(notification => ({
          ...notification,
          message: this.formatNotificationMessage(notification)
        }));
        this.notificationsSubject.next(formattedNotifications);
        this.updateUnreadCount();
        this.isLoadingSubject.next(false);
      }),
      catchError((error) => {
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Failed to load notifications');
        console.error('Failed to load notifications. Error:', error);
        return of([]);
      })
    );
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.fetchUnreadCount();
  }

  private fetchUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/count`).pipe(
      tap((result) => {
        this.unreadCountSubject.next(result.count);
      }),
      catchError((error) => {
        console.error('Failed to fetch unread count', error);
        return of({ count: 0 });
      })
    );
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.map(
          (notification) =>
            notification.id === id
              ? { ...notification, isRead: true }
              : notification
        );
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
      }),
      catchError((error) => {
        console.error(`Failed to mark notification ${id} as read`, error);
        return of(null as any);
      })
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.map(
          (notification) => ({ ...notification, isRead: true })
        );
        this.notificationsSubject.next(notifications);
        this.unreadCountSubject.next(0);
      }),
      catchError((error) => {
        console.error('Failed to mark all notifications as read', error);
        return of(void 0);
      })
    );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.filter(
          (notification) => notification.id !== id
        );
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
      }),
      catchError((error) => {
        console.error(`Failed to delete notification ${id}`, error);
        return of(void 0);
      })
    );
  }

  private updateUnreadCount() {
    const count = this.notificationsSubject.value.filter(
      (n) => !n.isRead
    ).length;
    this.unreadCountSubject.next(count);
  }

  // Mock data for testing - only used if API is unavailable
  private loadMockNotifications() {
    // Generate some test notifications
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Task assigned to you',
        message: 'You have been assigned to the task "Implement login page"',
        type: NotificationType.TASK_ASSIGNED,
        isRead: false,
        userId: 'current-user',
        link: '/projects/1/board',
        createdAt: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        updatedAt: new Date(Date.now() - 15 * 60000),
      },
      {
        id: '2',
        title: 'Comment on your task',
        message: 'John Doe commented on the task "Fix navbar responsiveness"',
        type: NotificationType.COMMENT_ADDED,
        isRead: true,
        userId: 'current-user',
        link: '/projects/1/board',
        createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 3600000),
      },
      {
        id: '3',
        title: 'You were mentioned',
        message:
          'Jane Smith mentioned you in a comment: "Can @you review this PR?"',
        type: NotificationType.MENTIONED,
        isRead: false,
        userId: 'current-user',
        link: '/projects/1/board',
        createdAt: new Date(Date.now() - 1 * 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 1 * 86400000),
      },
    ];

    // Update the notifications
    this.notificationsSubject.next(mockNotifications);
    this.updateUnreadCount();
  }
}
