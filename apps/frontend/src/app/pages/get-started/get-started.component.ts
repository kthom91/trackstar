import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PdsAuthService } from '../../services/pds-auth.service';
import { ModalService } from '../../services/modal.service';
import { getAllProviders, IntegrationProvider } from '@trackstar/integrations';

@Component({
  selector: 'app-get-started',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      
      <!-- Hero Welcome Banner -->
      <div class="relative overflow-hidden rounded-2xl bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] p-8 sm:p-10 shadow-sm bg-dot-grid">
        <div class="relative z-10 max-w-2xl space-y-3">
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0e0e0e] text-[#f0ede6] text-xs font-mono">
            <span>✨ Connected to PDS:</span>
            <span class="font-bold">{{ auth.currentHandle() || 'Anonymous' }}</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-serif font-bold text-[#0e0e0e] tracking-tight">
            Welcome to TrackStar
          </h1>
          
          <p class="text-xs sm:text-sm font-mono text-[#3d3830] leading-relaxed">
            Your personal data repository is ready. Follow this quick setup guide to install the companion sync extension and import your reading, film, and concert history.
          </p>
        </div>
      </div>

      <!-- Quick Steps Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <!-- STEP 1: Chrome Extension Card -->
        <div class="bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-2xl p-6 sm:p-7 space-y-5 flex flex-col justify-between shadow-sm hover:border-[#0e0e0e] transition-all">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="w-8 h-8 rounded-xl bg-[#0e0e0e] text-[#f0ede6] font-bold text-xs flex items-center justify-center shadow-sm font-mono">
                01
              </span>
              <span class="px-2.5 py-0.5 rounded-md bg-[rgba(14,14,14,0.08)] text-[#3d3830] text-[10px] font-bold font-mono uppercase tracking-wider">
                Extension
              </span>
            </div>

            <div>
              <h3 class="text-base font-serif font-bold text-[#0e0e0e]">Companion Extension</h3>
              <p class="text-xs font-mono text-[#9a8f7e] mt-1 leading-relaxed">
                Sync movies, books, and scrobbles directly between your PDS and web services with 1-click modal pre-fill.
              </p>
            </div>

            <!-- Step-by-step instructions -->
            <div class="bg-white border border-[rgba(14,14,14,0.24)] rounded-xl p-4 space-y-2.5 font-mono text-xs text-[#3d3830]">
              <div class="flex items-start space-x-2">
                <span class="text-[#0e0e0e] font-bold">1.</span>
                <span>Open <code class="text-[#0e0e0e] bg-[#f0ede6] px-1 py-0.5 rounded text-[11px]">chrome://extensions</code> in browser.</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-[#0e0e0e] font-bold">2.</span>
                <span>Enable <strong class="text-[#0e0e0e] font-semibold">Developer mode</strong> toggle.</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-[#0e0e0e] font-bold">3.</span>
                <span>Click <strong class="text-[#0e0e0e] font-semibold">Load unpacked</strong> from folder:</span>
              </div>
              <div class="flex items-center justify-between bg-[#f0ede6] p-2 rounded-lg border border-[rgba(14,14,14,0.14)] font-mono text-[10px] text-[#0e0e0e]">
                <span class="truncate">{{ extensionPath }}</span>
                <button (click)="copyPath()" class="ml-2 text-[#0e0e0e] hover:underline font-bold shrink-0">
                  {{ copied ? 'Copied ✓' : 'Copy' }}
                </button>
              </div>
            </div>
          </div>

          <div class="pt-2">
            <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer"
               class="w-full py-2.5 rounded-xl bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] font-mono text-xs font-semibold transition-all flex items-center justify-center space-x-2 shadow-sm">
              <span>Web Store (Preview)</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
          </div>
        </div>

        <!-- Dynamic Import Cards from Integration Registry -->
        <div *ngFor="let provider of importProviders; let i = index" 
             class="bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-2xl p-6 sm:p-7 space-y-5 flex flex-col justify-between shadow-sm hover:border-[#0e0e0e] transition-all">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="w-8 h-8 rounded-xl bg-[#0e0e0e] text-[#f0ede6] font-bold text-xs flex items-center justify-center shadow-sm font-mono">
                0{{ i + 2 }}
              </span>
              <span class="px-2.5 py-0.5 rounded-md bg-[rgba(14,14,14,0.08)] text-[#3d3830] text-[10px] font-bold font-mono uppercase tracking-wider">
                {{ provider.name }}
              </span>
            </div>

            <div>
              <h3 class="text-base font-serif font-bold text-[#0e0e0e]">Import {{ provider.name }}</h3>
              <p class="text-xs font-mono text-[#9a8f7e] mt-1 leading-relaxed">
                {{ provider.description }}
              </p>
            </div>

            <div class="bg-white border border-[rgba(14,14,14,0.24)] rounded-xl p-4 space-y-2.5 font-mono text-xs text-[#3d3830]">
              <div *ngIf="provider.exportGuideUrl" class="flex items-start space-x-2">
                <span class="text-[#0e0e0e] font-bold">1.</span>
                <span>Go to <a [href]="provider.exportGuideUrl" target="_blank" rel="noopener noreferrer" class="text-[#0e0e0e] underline font-semibold">{{ provider.exportGuideLabel || 'Export Settings ↗' }}</a></span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-[#0e0e0e] font-bold">2.</span>
                <span>{{ provider.exportInstructions || 'Download your data export file.' }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-[#0e0e0e] font-bold">3.</span>
                <span>Drop the exported file into TrackStar to parse and write to your PDS.</span>
              </div>
            </div>
          </div>

          <div class="pt-2">
            <a routerLink="/importers"
               class="w-full py-2.5 rounded-xl bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] font-mono text-xs font-semibold transition-all flex items-center justify-center space-x-2 shadow-sm">
              <span>Open {{ provider.name }} Importer →</span>
            </a>
          </div>
        </div>

      </div>

      <!-- Footer Quick Log Action -->
      <div class="p-6 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-sm">
        <div>
          <h4 class="text-sm font-serif font-bold text-[#0e0e0e]">Prefer to log items manually?</h4>
          <p class="text-xs font-mono text-[#9a8f7e]">You can record individual books, movies, or concerts at any time.</p>
        </div>
        <button (click)="openLogModal()" class="px-5 py-2.5 rounded-xl bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] font-mono text-xs font-semibold shadow-sm transition-all">
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

  get importProviders(): IntegrationProvider[] {
    return getAllProviders().filter(p => (p.capabilities as readonly string[]).includes('csv_import'));
  }

  copyPath() {
    navigator.clipboard.writeText(this.extensionPath);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  openLogModal() {
    this.modal.openLogModal();
  }
}
