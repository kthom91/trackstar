import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LogModalComponent } from './components/log-modal/log-modal.component';
import { PdsLoginModalComponent } from './components/pds-login-modal/pds-login-modal.component';
import { ModalService } from './services/modal.service';
import { PdsRepositoryService } from './services/pds-repo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, LogModalComponent, PdsLoginModalComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-[#0b0f19] text-gray-100 font-sans">
      <app-navbar (openLogModal)="modal.openLogModal()"
                  (openPdsModal)="modal.openPdsModal()"
                  (syncPds)="repo.syncFromPds()"></app-navbar>

      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet></router-outlet>
      </main>

      <!-- Modals -->
      <app-log-modal [isOpen]="modal.isLogModalOpen()"
                     (close)="modal.closeLogModal()"
                     (saved)="onMediaSaved()"></app-log-modal>

      <app-pds-login-modal *ngIf="modal.isPdsModalOpen()"
                           (close)="modal.closePdsModal()"></app-pds-login-modal>

      <footer class="border-t border-white/10 py-6 text-center text-xs text-gray-500 bg-[#0b0f19]">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TrackStar (PDS Client) — Personal media log</span>
          <span class="text-gray-600">Built on the AT Protocol (Authenticated Transfer)</span>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent {
  modal = inject(ModalService);
  repo = inject(PdsRepositoryService);

  onMediaSaved() {
    window.dispatchEvent(new Event('trackstar:media-saved'));
  }
}
