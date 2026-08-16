import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PdsAuthService } from '../../services/pds-auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-40 w-full border-b border-[rgba(14,14,14,0.14)] bg-[#faf7f2] backdrop-blur-md relative">
      
      <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        <!-- Brand / Logo & Dynamic Compact Breadcrumb -->
        <div class="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <a routerLink="/" class="flex items-center space-x-3 group shrink-0">
            <div class="w-8 h-8 rounded-xl bg-[#0e0e0e] flex items-center justify-center text-[#f0ede6] font-bold text-sm shadow-sm group-hover:scale-105 transition-transform duration-200 shrink-0">
              <span>t*</span>
            </div>

            <!-- Full Wordmark (visible on desktop >= 1000px nav breakpoint) -->
            <div class="hidden nav:flex flex-col">
              <span class="font-serif font-bold text-xl tracking-tight text-[#0e0e0e] leading-none">TrackStar</span>
              <span class="text-[9px] text-[#9a8f7e] font-mono tracking-[0.22em] uppercase mt-0.5">MEDIA TRACKER</span>
            </div>
          </a>

          <!-- Mobile / Tablet Breadcrumb Page Indicator (< 1000px nav breakpoint) -->
          <div class="nav:hidden flex items-center space-x-1.5 font-mono text-xs text-[#9a8f7e] min-w-0">
            <span class="text-[rgba(14,14,14,0.3)] font-sans text-sm select-none">/</span>
            
            <!-- Active Page Pill with quick dropdown toggle -->
            <button (click)="toggleMobileMenu()"
                    title="Switch View"
                    class="flex items-center space-x-1 px-2 py-1 rounded-lg bg-[rgba(14,14,14,0.06)] hover:bg-[rgba(14,14,14,0.1)] text-[#0e0e0e] font-bold transition-colors truncate max-w-[150px] sm:max-w-[220px]">
              <span class="truncate">{{ currentPageTitle }}</span>
              <svg class="w-3 h-3 text-[#9a8f7e] shrink-0 ml-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Navigation Links (visible at >= 1000px nav breakpoint) -->
        <nav class="hidden nav:flex items-center space-x-6 lg:space-x-8 font-mono text-xs">
          <a routerLink="/" 
             routerLinkActive="text-[#0e0e0e] font-bold border-b-2 border-[#0e0e0e] pb-0.5" 
             [routerLinkActiveOptions]="{exact: true}"
             class="text-[#3d3830] hover:text-[#0e0e0e] transition-colors py-1">
            Media Feed
          </a>

          <a routerLink="/want-to-consume" 
             routerLinkActive="text-[#0e0e0e] font-bold border-b-2 border-[#0e0e0e] pb-0.5" 
             class="text-[#3d3830] hover:text-[#0e0e0e] transition-colors py-1">
            Want to Consume
          </a>

          <a routerLink="/importers" 
             routerLinkActive="text-[#0e0e0e] font-bold border-b-2 border-[#0e0e0e] pb-0.5" 
             class="text-[#3d3830] hover:text-[#0e0e0e] transition-colors py-1">
            Import & Sync
          </a>

          <a routerLink="/get-started" 
             routerLinkActive="text-[#0e0e0e] font-bold border-b-2 border-[#0e0e0e] pb-0.5" 
             class="text-[#3d3830] hover:text-[#0e0e0e] transition-colors py-1">
            Get Started
          </a>
        </nav>

        <!-- Actions & PDS Auth -->
        <div class="flex items-center space-x-2 sm:space-x-3">
          
          <!-- PDS Status / Account Pill (collapses to just status dot at smaller widths) -->
          <button (click)="openPdsModal.emit()"
                  [title]="auth.isAuthenticated() ? auth.currentHandle() : 'Connect PDS'"
                  class="flex items-center space-x-2 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-[rgba(14,14,14,0.24)] bg-[#faf7f2]/90 hover:bg-[#f0ede6] text-xs font-mono text-[#0e0e0e] transition-all shadow-sm">
            <span class="w-2 h-2 rounded-full shrink-0" [ngClass]="auth.isAuthenticated() ? 'bg-[#5a8a5a]' : 'bg-[#9a8f7e]'"></span>
            <span class="hidden sm:inline truncate max-w-[130px] md:max-w-[180px]">
              {{ auth.isAuthenticated() ? auth.currentHandle() : 'Connect PDS' }}
            </span>
          </button>

          <!-- Sync from PDS Button (Equalizer / Sliders Icon) -->
          <button (click)="syncPds.emit()"
                  title="Sync from PDS"
                  class="w-8 h-8 rounded-full border border-[rgba(14,14,14,0.24)] bg-[#faf7f2]/90 hover:bg-[#f0ede6] text-[#3d3830] hover:text-[#0e0e0e] flex items-center justify-center transition-all shadow-sm shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16M8 5v6m8 5v6"></path>
            </svg>
          </button>

          <!-- Log Media Button (Solid Black Circle +) -->
          <button (click)="openLogModal.emit()"
                  title="Log Media Entry"
                  class="w-8 h-8 flex items-center justify-center rounded-full bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] shadow-sm transition-all active:scale-95 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
            </svg>
          </button>

        </div>

      </div>

      <!-- Collapsed Navigation Dropdown Drawer (< 1000px) -->
      <div *ngIf="isMobileMenuOpen" 
           class="nav:hidden border-t border-[rgba(14,14,14,0.14)] bg-[#faf7f2] px-4 py-3 space-y-1 font-mono text-xs shadow-lg animate-fadeIn relative z-20">
        <a routerLink="/" 
           (click)="isMobileMenuOpen = false"
           routerLinkActive="bg-[#0e0e0e] text-[#f0ede6] font-bold" 
           [routerLinkActiveOptions]="{exact: true}"
           class="block px-3.5 py-2.5 rounded-xl text-[#3d3830] hover:text-[#0e0e0e] hover:bg-[rgba(14,14,14,0.05)] transition-all">
          Media Feed
        </a>

        <a routerLink="/want-to-consume" 
           (click)="isMobileMenuOpen = false"
           routerLinkActive="bg-[#0e0e0e] text-[#f0ede6] font-bold" 
           class="block px-3.5 py-2.5 rounded-xl text-[#3d3830] hover:text-[#0e0e0e] hover:bg-[rgba(14,14,14,0.05)] transition-all">
          Want to Consume
        </a>

        <a routerLink="/importers" 
           (click)="isMobileMenuOpen = false"
           routerLinkActive="bg-[#0e0e0e] text-[#f0ede6] font-bold" 
           class="block px-3.5 py-2.5 rounded-xl text-[#3d3830] hover:text-[#0e0e0e] hover:bg-[rgba(14,14,14,0.05)] transition-all">
          Import & Sync
        </a>

        <a routerLink="/get-started" 
           (click)="isMobileMenuOpen = false"
           routerLinkActive="bg-[#0e0e0e] text-[#f0ede6] font-bold" 
           class="block px-3.5 py-2.5 rounded-xl text-[#3d3830] hover:text-[#0e0e0e] hover:bg-[rgba(14,14,14,0.05)] transition-all">
          Get Started
        </a>
      </div>

    </header>
  `
})
export class NavbarComponent {
  auth = inject(PdsAuthService);
  router = inject(Router);

  openLogModal = output<void>();
  openPdsModal = output<void>();
  syncPds = output<void>();

  isMobileMenuOpen = false;

  get currentPageTitle(): string {
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/want-to-consume')) return 'Want to Consume';
    if (url.startsWith('/importers')) return 'Import & Sync';
    if (url.startsWith('/get-started')) return 'Get Started';
    return 'Media Feed';
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
}
