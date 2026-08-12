import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

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
              <span class="text-[10px] text-indigo-400 font-mono tracking-widest uppercase -mt-1">Media Tracker</span>
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

        </nav>

        <!-- Actions -->
        <div class="flex items-center space-x-3">
          <button (click)="openLogModal.emit()"
                  class="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>Log Media</span>
          </button>
        </div>

      </div>
    </header>
  `
})
export class NavbarComponent {
  openLogModal = output<void>();
}
