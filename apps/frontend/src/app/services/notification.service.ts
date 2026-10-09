import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private document = inject(DOCUMENT);

  isStandalone(): boolean {
    const window = this.document.defaultView;
    if (!window) return false;
    
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  }

  canShowSystemNotification(): boolean {
    const window = this.document.defaultView;
    if (!window || !('Notification' in window)) return false;
    
    return Notification.permission === 'granted';
  }

  showSystemNotification(title: string, options?: NotificationOptions): void {
    const window = this.document.defaultView;
    if (window && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
}
