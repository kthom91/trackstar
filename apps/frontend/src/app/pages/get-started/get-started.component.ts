import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PdsAuthService } from '../../services/pds-auth.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-get-started',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      
      <!-- Hero Welcome Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-pink-950/60 border border-indigo-500/30 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div class="relative z-10 max-w-2xl space-y-3">
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
            <span>✨ Connected to PDS:</span>
            <span class="font-mono text-white">{{ auth.currentHandle() || 'Anonymous' }}</span>
          </div>

          <h1 class="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
            Welcome to Trackstar!
          </h1>
          
          <p class="text-sm sm:text-base text-gray-300 leading-relaxed">
            Your personal data repository is ready. Follow this quick setup guide to install the Letterboxd Chrome sync extension and import your reading and film history.
          </p>
        </div>

        <!-- Decorative background glow -->
        <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <!-- Quick Steps Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- STEP 1: Chrome Extension Card -->
        <div class="bg-[#131b2e]/70 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5 backdrop-blur-xl hover:border-indigo-500/40 transition-all flex flex-col justify-between shadow-xl">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-indigo-600/30">
                01
              </span>
              <span class="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[11px] font-semibold uppercase tracking-wider border border-indigo-500/20">
                Browser Extension
              </span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white font-['Outfit']">Install Chrome Companion Extension</h3>
              <p class="text-xs text-gray-400 mt-1 leading-relaxed">
                Sync movies from your PDS directly to your Letterboxd diary with 1-click modal pre-fill.
              </p>
            </div>

            <!-- Step-by-step instructions -->
            <div class="bg-[#0b0f19] border border-white/5 rounded-2xl p-4 space-y-2.5 text-xs text-gray-300">
              <div class="flex items-start space-x-2">
                <span class="text-indigo-400 font-bold">1.</span>
                <span>Open <code class="text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded">chrome://extensions</code> in Chrome or Brave.</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-indigo-400 font-bold">2.</span>
                <span>Enable <strong class="text-white">Developer mode</strong> (top right toggle).</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-indigo-400 font-bold">3.</span>
                <span>Click <strong class="text-white">Load unpacked</strong> and select folder:</span>
              </div>
              <div class="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10 font-mono text-[10px] text-gray-300">
                <span class="truncate">{{ extensionPath }}</span>
                <button (click)="copyPath()" class="ml-2 text-indigo-400 hover:text-indigo-300 shrink-0">
                  {{ copied ? 'Copied ✓' : 'Copy' }}
                </button>
              </div>
            </div>
          </div>

          <div class="pt-2">
            <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer"
               class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25">
              <span>Install Extension from Chrome Web Store (Preview)</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
          </div>
        </div>

        <!-- STEP 2: Letterboxd Diary & Watchlist -->
        <div class="bg-[#131b2e]/70 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5 backdrop-blur-xl hover:border-orange-500/40 transition-all flex flex-col justify-between shadow-xl">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="w-8 h-8 rounded-xl bg-orange-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-orange-600/30">
                02
              </span>
              <span class="px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-300 text-[11px] font-semibold uppercase tracking-wider border border-orange-500/20">
                Letterboxd
              </span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white font-['Outfit']">Import Letterboxd Diary & Watchlist</h3>
              <p class="text-xs text-gray-400 mt-1 leading-relaxed">
                Import your complete film diary, watch dates, star ratings, and watchlist directly to your PDS.
              </p>
            </div>

            <div class="bg-[#0b0f19] border border-white/5 rounded-2xl p-4 space-y-2.5 text-xs text-gray-300">
              <div class="flex items-start space-x-2">
                <span class="text-orange-400 font-bold">1.</span>
                <span>Go to <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener noreferrer" class="text-orange-400 hover:underline">Letterboxd &gt; Settings &gt; Import & Export ↗</a></span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-orange-400 font-bold">2.</span>
                <span>Click <strong class="text-white">Export Your Data</strong> to download your ZIP archive.</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-orange-400 font-bold">3.</span>
                <span>Extract and drop <code class="text-orange-300 bg-white/5 px-1 py-0.5 rounded">diary.csv</code> or <code class="text-orange-300 bg-white/5 px-1 py-0.5 rounded">watchlist.csv</code> into Trackstar.</span>
              </div>
            </div>
          </div>

          <div class="pt-2">
            <a routerLink="/importers"
               class="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-600/25">
              <span>Open Letterboxd Importer →</span>
            </a>
          </div>
        </div>

        <!-- STEP 3: StoryGraph Books Collection -->
        <div class="bg-[#131b2e]/70 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5 backdrop-blur-xl hover:border-teal-500/40 transition-all flex flex-col justify-between shadow-xl">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-teal-600/30">
                03
              </span>
              <span class="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-300 text-[11px] font-semibold uppercase tracking-wider border border-teal-500/20">
                StoryGraph
              </span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white font-['Outfit']">Import StoryGraph Library</h3>
              <p class="text-xs text-gray-400 mt-1 leading-relaxed">
                Sync all your read books, currently-reading shelf, to-read list, ISBNs, reviews, and 1-5 star ratings.
              </p>
            </div>

            <div class="bg-[#0b0f19] border border-white/5 rounded-2xl p-4 space-y-2.5 text-xs text-gray-300">
              <div class="flex items-start space-x-2">
                <span class="text-teal-400 font-bold">1.</span>
                <span>Visit <a href="https://app.thestorygraph.com/manage" target="_blank" rel="noopener noreferrer" class="text-teal-400 hover:underline">StoryGraph &gt; Manage Account ↗</a></span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-teal-400 font-bold">2.</span>
                <span>Scroll down to <strong class="text-white">Export StoryGraph Data</strong> and download the CSV.</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-teal-400 font-bold">3.</span>
                <span>Drop the CSV in Trackstar to parse and write records directly to your PDS.</span>
              </div>
            </div>
          </div>

          <div class="pt-2">
            <a routerLink="/importers"
               class="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-600/25">
              <span>Open StoryGraph Importer →</span>
            </a>
          </div>
        </div>

      </div>

      <!-- Footer Quick Log Action -->
      <div class="p-6 bg-[#131b2e]/50 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 class="text-sm font-bold text-white">Prefer to log items manually?</h4>
          <p class="text-xs text-gray-400">You can record individual books, movies, or concerts at any time.</p>
        </div>
        <button (click)="openLogModal()" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all">
          + Log Media Entry
        </button>
      </div>

    </div>
  `
})
export class GetStartedComponent {
  auth = inject(PdsAuthService);
  modal = inject(ModalService);
  copied = false;
  extensionPath = 'dist/browser-extension';

  copyPath() {
    navigator.clipboard.writeText('/Users/kenny/Documents/GitHub/trackstar/dist/browser-extension');
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  openLogModal() {
    this.modal.openLogModal();
  }
}
