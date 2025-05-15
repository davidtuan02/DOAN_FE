import { Injectable } from '@angular/core';
import { NzMessageService, NzMessageRef } from 'ng-zorro-antd/message';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // Add the TaskFlow class to the message container
  private initialized = false;

  constructor(private message: NzMessageService) {
    this.initMessageContainer();
  }

  /**
   * Initialize the message container with custom class
   */
  private initMessageContainer(): void {
    if (this.initialized) return;

    // Get the message container and add our custom class
    setTimeout(() => {
      const messageContainer = document.querySelector('.ant-message');
      if (messageContainer) {
        messageContainer.classList.add('taskflow-toast');
        this.initialized = true;
      }
    }, 100);
  }

  /**
   * Display a success toast notification
   */
  success(content: string, duration: number = 3): NzMessageRef {
    this.initMessageContainer();
    return this.message.success(content, { nzDuration: duration * 1000 });
  }

  /**
   * Display an error toast notification
   */
  error(content: string, duration: number = 5): NzMessageRef {
    this.initMessageContainer();
    return this.message.error(content, { nzDuration: duration * 1000 });
  }

  /**
   * Display an info toast notification
   */
  info(content: string, duration: number = 3): NzMessageRef {
    this.initMessageContainer();
    return this.message.info(content, { nzDuration: duration * 1000 });
  }

  /**
   * Display a warning toast notification
   */
  warning(content: string, duration: number = 4): NzMessageRef {
    this.initMessageContainer();
    return this.message.warning(content, { nzDuration: duration * 1000 });
  }

  /**
   * Display a loading toast notification
   */
  loading(content: string, options?: { nzDuration?: number }): NzMessageRef {
    this.initMessageContainer();
    return this.message.loading(content, options);
  }

  /**
   * Remove a specific toast notification by ID
   */
  removeById(id: string): void {
    this.message.remove(id);
  }

  /**
   * Remove a toast notification by reference
   */
  removeByRef(ref: NzMessageRef): void {
    // The NG-ZORRO library handles the message reference internally
    this.message.remove(ref as any);
  }

  /**
   * Generic remove method - for backward compatibility
   * @param messageId Either a message reference or string ID
   */
  remove(messageId: string | NzMessageRef): void {
    if (typeof messageId === 'string') {
      this.removeById(messageId);
    } else {
      this.removeByRef(messageId);
    }
  }

  /**
   * Remove all toast notifications
   */
  removeAll(): void {
    this.message.remove();
  }
}
