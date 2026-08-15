import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PdsAuthService } from '../../services/pds-auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Brand / Logo -->
        <div class="flex items-center space-x-3">
          <a routerLink="/" class="flex items-center space-x-2 group">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <span class="text-white font-black text-lg tracking-tighter">t*</span>
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-lg tracking-tight text-white font-['Outfit']">TrackStar</span>
              <span class="text-[10px] text-indigo-400 font-mono tracking-widest uppercase -mt-1">PDS Media Client</span>
            </div>
          </a>
        </div>

        <!-- Navigation Links -->
        <nav class="flex items-center space-x-1 sm:space-x-2">
          <a routerLink="/" 
             routerLinkActive="bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
             [routerLinkActiveOptions]="{exact: true}"
             class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 border border-transparent transition-all">
            Media Feed
          </a>
          
          <a routerLink="/want-to-consume" 
             routerLinkActive="bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
             class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 border border-transparent transition-all">
            Want to Consume
          </a>

          <a routerLink="/importers" 
             routerLinkActive="bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
             class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 border border-transparent transition-all">
            Import & Sync
          </a>

          <a routerLink="/get-started" 
             routerLinkActive="bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
             class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 border border-transparent transition-all">
            Get Started
          </a>
        </nav>

        <!-- Actions & PDS Auth -->
        <div class="flex items-center space-x-2 sm:space-x-3">
          
          <!-- PDS Status / Account Pill + Sync Button -->
          <div class="flex items-center space-x-1.5">
            <button (click)="openPdsModal.emit()"
                    class="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium transition-all">
              <span class="w-2 h-2 rounded-full" [ngClass]="auth.isAuthenticated() ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-amber-400'"></span>
              <span class="text-gray-200 font-mono truncate max-w-[120px] sm:max-w-[150px]">
                {{ auth.isAuthenticated() ? auth.currentHandle() : 'Connect PDS' }}
              </span>
            </button>

            <!-- Sync from PDS Button -->
            <button (click)="syncPds.emit()"
                    title="Sync from PDS"
                    class="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          </div>

          <!-- Log Media Button (icon only) -->
          <button (click)="openLogModal.emit()"
                  title="Log Media"
                  class="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
          </button>
        </div>

      </div>
    </header>
  `
})
export class NavbarComponent {
  auth = inject(PdsAuthService);

  openLogModal = output<void>();
  openPdsModal = output<void>();
  syncPds = output<void>();
}
