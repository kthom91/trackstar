import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LogModalComponent } from './components/log-modal/log-modal.component';
import { PdsLoginModalComponent } from './components/pds-login-modal/pds-login-modal.component';
import { ModalService } from './services/modal.service';
import { PdsRepositoryService } from './services/pds-repo.service';
import { PdsAuthService } from './services/pds-auth.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, LogModalComponent, PdsLoginModalComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-[#f0ede6] text-[#0e0e0e] font-mono">
      <app-navbar (openLogModal)="modal.openLogModal()"
                  (openPdsModal)="modal.openPdsModal()"
                  (syncPds)="repo.syncFromPds()"></app-navbar>

      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 lg:pt-5 pb-8">
        <router-outlet></router-outlet>
      </main>

      <!-- Modals -->
      <app-log-modal [isOpen]="modal.isLogModalOpen()"
                     (close)="modal.closeLogModal()"
                     (saved)="onMediaSaved()"></app-log-modal>

      <app-pds-login-modal *ngIf="modal.isPdsModalOpen()"
                           (close)="modal.closePdsModal()"></app-pds-login-modal>

      <!-- Toast Notification -->
      <div *ngIf="showToast" class="fixed bottom-6 right-6 bg-[#0e0e0e] text-[#f0ede6] px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 z-50 animate-fadeIn border border-[rgba(240,237,230,0.1)]">
        <svg class="w-5 h-5 text-[#9a8f7e] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="flex-1 min-w-0 pr-2">
          <p class="text-sm font-bold truncate">Not connected</p>
          <p class="text-xs text-[#9a8f7e] truncate">Please sign in to your PDS</p>
        </div>
        <button (click)="closeToast()" class="text-[#9a8f7e] hover:text-[#f0ede6] transition-colors shrink-0 p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <footer class="border-t border-[rgba(14,14,14,0.14)] py-6 text-center text-xs text-[#9a8f7e] bg-[#f0ede6]">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <span>TrackStar (PDS Client) — Personal media log</span>
          <span class="text-[#9a8f7e]">Built on the AT Protocol (Authenticated Transfer)</span>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent implements OnInit {
  modal = inject(ModalService);
  repo = inject(PdsRepositoryService);
  auth = inject(PdsAuthService);
  notification = inject(NotificationService);

  showToast = false;

  ngOnInit() {
    const window = this.document.defaultView;
    if (window) {
      window.addEventListener('appinstalled', () => {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      });
    }

    if (!this.auth.isAuthenticated()) {
      if (this.notification.isStandalone()) {
        if (this.notification.canShowSystemNotification()) {
          this.notification.showSystemNotification('TrackStar', {
            body: 'Please sign in to your PDS to sync your media log.',
            icon: '/icon-192.png'
          });
        } else {
          // Fallback to in-app toast if native notification is not granted
          this.showToast = true;
        }
      } else {
        this.showToast = true;
      }
    }
  }

  closeToast() {
    this.showToast = false;
  }

  private document = inject(DOCUMENT);

  onMediaSaved() {
    const window = this.document.defaultView;
    if (window) {
      window.dispatchEvent(new Event('trackstar:media-saved'));
    }
  }
}
