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

  async showSystemNotification(title: string, options?: NotificationOptions): Promise<void> {
    const window = this.document.defaultView;
    if (window && 'Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in window.navigator) {
        try {
          const registration = await window.navigator.serviceWorker.ready;
          await registration.showNotification(title, options);
          return;
        } catch (err) {
          console.warn('[NotificationService] ServiceWorker showNotification failed, falling back to Notification API', err);
        }
      }
      
      // Fallback for browsers without service worker or if the SW call fails
      new Notification(title, options);
    }
  }
}
