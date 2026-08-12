import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LogModalComponent } from './components/log-modal/log-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, LogModalComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-[#0b0f19] text-gray-100 font-sans">
      <app-navbar (openLogModal)="isModalOpen = true"></app-navbar>

      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>

      <app-log-modal [isOpen]="isModalOpen"
                     (close)="isModalOpen = false"
                     (saved)="onMediaSaved()"></app-log-modal>

      <footer class="border-t border-white/10 py-6 text-center text-xs text-gray-500 bg-[#0b0f19]">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TrackStar (v0.1.0) — Event-log media tracker</span>
          <span class="text-gray-600">AT Protocol / Track Meet ready ● Powered by FastAPI & Angular</span>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent {
  isModalOpen = false;

  onMediaSaved() {
    // Force reload or refresh page data if needed
    window.dispatchEvent(new Event('trackstar:media-saved'));
  }
}
