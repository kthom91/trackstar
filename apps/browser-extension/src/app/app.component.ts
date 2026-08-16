import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtensionBridgeService } from './services/extension-bridge.service';
import { ExtensionMediaItem } from '@trackstar/data';
import { getProvider, getAllProviders, IntegrationProvider } from '@trackstar/integrations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-screen max-h-[580px] bg-[#f0ede6] text-[#0e0e0e] font-mono text-xs selection:bg-[#0e0e0e] selection:text-[#f0ede6]">
      
      <!-- Top Header -->
      <header class="flex items-center justify-between px-3.5 py-2.5 bg-[#faf7f2] border-b border-[rgba(14,14,14,0.14)] shrink-0 shadow-xs">
        <div class="flex items-center space-x-3 select-none">
          <div class="w-8 h-8 rounded-xl bg-[#0e0e0e] flex items-center justify-center text-[#f0ede6] font-bold text-sm shadow-sm shrink-0">
            <span>t*</span>
          </div>
          <div class="flex flex-col">
            <span class="font-serif font-bold text-xl tracking-tight text-[#0e0e0e] leading-none">TrackStar</span>
            <span class="text-[9px] text-[#9a8f7e] font-mono tracking-[0.22em] uppercase mt-0.5">MEDIA TRACKER</span>
          </div>
        </div>

        <div class="flex items-center space-x-1.5">
          <!-- Refresh Button -->
          <button (click)="refresh()" [disabled]="bridge.loading()"
                  title="Refresh records from PDS"
                  class="p-1.5 rounded-lg text-[#3d3830] hover:text-[#0e0e0e] hover:bg-[rgba(14,14,14,0.06)] transition-colors">
            <svg class="w-3.5 h-3.5" [class.animate-spin]="bridge.loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>

          <!-- Settings Toggle -->
          <button (click)="toggleSettings()"
                  [class]="isSettingsOpen() ? 'bg-[#0e0e0e] text-[#f0ede6]' : 'text-[#3d3830] hover:text-[#0e0e0e] hover:bg-[rgba(14,14,14,0.06)]'"
                  title="PDS Connection Settings"
                  class="p-1.5 rounded-lg transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Main Body Container -->
      <main class="flex-1 overflow-y-auto p-3 space-y-3">
        
        <!-- PDS Settings Modal / Dropdown Panel -->
        <div *ngIf="isSettingsOpen()" class="p-3 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-xl space-y-3 shadow-sm animate-fadeIn">
          <div class="flex items-center justify-between pb-1.5 border-b border-[rgba(14,14,14,0.14)]">
            <span class="font-serif font-bold text-xs text-[#0e0e0e]">PDS Connection</span>
            <span class="text-[9px] font-mono text-[#9a8f7e] uppercase">AT Protocol</span>
          </div>

          <!-- Auth Mode Tabs -->
          <div class="grid grid-cols-2 p-0.5 bg-[#f0ede6] rounded-lg font-mono text-[10px] border border-[rgba(14,14,14,0.1)]">
            <button type="button"
                    (click)="authMode = 'oauth'"
                    [ngClass]="authMode === 'oauth' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold shadow-xs' : 'text-[#3d3830]'"
                    class="py-1 rounded-md transition-all text-center">
              🦋 OAuth (Bluesky)
            </button>
            <button type="button"
                    (click)="authMode = 'password'"
                    [ngClass]="authMode === 'password' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold shadow-xs' : 'text-[#3d3830]'"
                    class="py-1 rounded-md transition-all text-center">
              🖥️ Local / Password
            </button>
          </div>

          <!-- 1. OAuth Form -->
          <div *ngIf="authMode === 'oauth'" class="space-y-2">
            <div>
              <label class="block text-[10px] text-[#3d3830] font-bold mb-0.5">Bluesky / AT Protocol Handle</label>
              <input type="text" [(ngModel)]="handle" placeholder="e.g. kthom91.bsky.social"
                     (keydown.enter)="saveOAuth()"
                     class="w-full px-2.5 py-1.5 bg-white border border-[rgba(14,14,14,0.24)] rounded-md text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
              <p class="text-[9px] text-[#9a8f7e] mt-1">Authenticates securely via standard PKCE OAuth popup.</p>
            </div>

            <button (click)="saveOAuth()" [disabled]="bridge.loading() || !handle.trim()"
                    class="w-full py-1.5 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-50 text-[#f0ede6] font-mono font-medium rounded-lg text-xs transition-colors shadow-xs">
              {{ bridge.loading() ? 'Opening Bluesky OAuth…' : 'Sign In with Bluesky' }}
            </button>
          </div>

          <!-- 2. Password Form -->
          <div *ngIf="authMode === 'password'" class="space-y-2">
            <div>
              <label class="block text-[10px] text-[#3d3830] font-bold mb-0.5">PDS URL</label>
              <input type="text" [(ngModel)]="pdsUrl" placeholder="https://bsky.social"
                     class="w-full px-2.5 py-1 bg-white border border-[rgba(14,14,14,0.24)] rounded-md text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
              <div class="flex space-x-1.5 pt-1">
                <button (click)="setPresetBsky()" type="button" class="px-2 py-0.5 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.18)] rounded text-[9px] text-[#3d3830] transition-colors">
                  🦋 Bluesky (bsky.social)
                </button>
                <button (click)="setPresetLocal()" type="button" class="px-2 py-0.5 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.18)] rounded text-[9px] text-[#3d3830] transition-colors">
                  🖥️ Local (:3000)
                </button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] text-[#3d3830] font-bold mb-0.5">Handle</label>
              <input type="text" [(ngModel)]="handle" placeholder="user.test"
                     class="w-full px-2.5 py-1 bg-white border border-[rgba(14,14,14,0.24)] rounded-md text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            </div>

            <div>
              <label class="block text-[10px] text-[#3d3830] font-bold mb-0.5">Password</label>
              <input type="password" [(ngModel)]="password" placeholder="••••••••"
                     class="w-full px-2.5 py-1 bg-white border border-[rgba(14,14,14,0.24)] rounded-md text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            </div>

            <button (click)="savePassword()" [disabled]="bridge.loading() || !handle.trim() || !password.trim()"
                    class="w-full py-1.5 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-50 text-[#f0ede6] font-mono font-medium rounded-lg text-xs transition-colors shadow-xs">
              {{ bridge.loading() ? 'Connecting…' : 'Connect with Password' }}
            </button>
          </div>

          <!-- TMDB API Key Settings -->
          <div class="space-y-1 pt-2 border-t border-[rgba(14,14,14,0.14)] font-mono text-xs">
            <div class="flex items-center justify-between">
              <label class="font-bold uppercase text-[9px] text-[#3d3830] tracking-wider">TMDB API Key (Optional)</label>
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" class="text-[9px] text-[#0e0e0e] hover:underline">Get Key ↗</a>
            </div>
            <input type="text" 
                   [(ngModel)]="tmdbApiKey" 
                   (ngModelChange)="onTmdbKeyChange()"
                   placeholder="Free TMDB API key for movie posters" 
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-md px-2.5 py-1 text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            <p class="text-[9px] text-[#9a8f7e]">Enriches movie cover art and metadata.</p>
          </div>

          <!-- Last.fm API Key Settings -->
          <div class="space-y-1 pt-1.5 border-t border-[rgba(14,14,14,0.14)] font-mono text-xs">
            <div class="flex items-center justify-between">
              <label class="font-bold uppercase text-[9px] text-[#3d3830] tracking-wider">Last.fm API Key (Optional)</label>
              <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer" class="text-[9px] text-[#0e0e0e] hover:underline">Get Key ↗</a>
            </div>
            <input type="text" 
                   [(ngModel)]="lastfmApiKey" 
                   (ngModelChange)="onLastfmKeyChange()"
                   placeholder="Free Last.fm API key for band pictures" 
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-md px-2.5 py-1 text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            <p class="text-[9px] text-[#9a8f7e]">Enriches concert and band artwork.</p>
          </div>

          <!-- If connected, show disconnect option -->
          <div *ngIf="bridge.isConnected()" class="pt-1.5 border-t border-[rgba(14,14,14,0.14)]">
            <button (click)="logout()"
                    class="w-full py-1 text-center text-[10px] text-rose-700 hover:text-rose-900 transition-colors">
              Disconnect Account
            </button>
          </div>
        </div>

        <!-- Connection Status Pill -->
        <div class="flex items-center justify-between px-3 py-1.5 bg-[#faf7f2] border border-[rgba(14,14,14,0.14)] rounded-lg text-[11px]">
          <div class="flex items-center space-x-2 min-w-0">
            <span class="w-2 h-2 rounded-full shrink-0"
                  [ngClass]="bridge.isConnected() ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-amber-600'"></span>
            <span class="truncate font-medium text-[#0e0e0e]">
              {{ bridge.isConnected() ? (bridge.config().handle || 'Connected') : 'Not Connected' }}
            </span>
          </div>
          <span class="text-[10px] font-mono text-[#9a8f7e] shrink-0">
            {{ bridge.mediaItems().length }} records
          </span>
        </div>

        <!-- Navigation Tabs (Integrations vs Unsynced Items) -->
        <div class="flex border-b border-[rgba(14,14,14,0.18)]">
          <button (click)="activeTab.set('integrations')"
                  [class]="activeTab() === 'integrations' ? 'border-[#0e0e0e] text-[#0e0e0e] font-bold' : 'border-transparent text-[#9a8f7e] hover:text-[#0e0e0e]'"
                  class="flex-1 py-1.5 text-center border-b-2 text-xs font-mono transition-all">
            Providers ({{ activeProviders.length }})
          </button>
          <button (click)="activeTab.set('unsynced')"
                  [class]="activeTab() === 'unsynced' ? 'border-[#0e0e0e] text-[#0e0e0e] font-bold' : 'border-transparent text-[#9a8f7e] hover:text-[#0e0e0e]'"
                  class="flex-1 py-1.5 text-center border-b-2 text-xs font-mono transition-all flex items-center justify-center space-x-1">
            <span>Unsynced</span>
            <span *ngIf="bridge.unsyncedItems().length > 0" 
                  class="px-1.5 py-0.2 rounded-full bg-[#0e0e0e] text-[#f0ede6] text-[9px] font-bold">
              {{ bridge.unsyncedItems().length }}
            </span>
          </button>
        </div>

        <!-- TAB 1: DYNAMIC INTEGRATIONS LIST -->
        <div *ngIf="activeTab() === 'integrations'" class="space-y-3">
          
          <div *ngFor="let provider of activeProviders" 
               class="p-3 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-xl space-y-2.5 shadow-xs">
            
            <!-- Card Header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 border border-[rgba(14,14,14,0.14)]">
                  <span class="font-serif font-black text-xs text-[#0e0e0e]">{{ provider.avatarText }}</span>
                </div>
                <div class="min-w-0">
                  <div class="font-serif font-bold text-[#0e0e0e] text-xs">{{ provider.name }}</div>
                  <div class="text-[10px] font-mono text-[#9a8f7e] capitalize">{{ provider.mediaType }}s & Logs</div>
                </div>
              </div>

              <!-- Top Right Status Indicators -->
              <div class="flex items-center space-x-1.5 shrink-0 text-[10px] font-mono">
                <span class="px-2 py-0.5 rounded-full bg-[rgba(90,138,90,0.12)] text-[#3a6b3a] border border-[rgba(90,138,90,0.3)] font-medium"
                      [title]="'Synced with ' + provider.name">
                  {{ getProviderSyncedCount(provider) }} synced
                </span>
                <span *ngIf="getProviderUnsyncedCount(provider) > 0"
                      class="px-2 py-0.5 rounded-full bg-[rgba(14,14,14,0.06)] text-[#3d3830] border border-[rgba(14,14,14,0.18)] font-medium"
                      [title]="'Unsynced ' + provider.mediaType + 's'">
                  {{ getProviderUnsyncedCount(provider) }} unsynced
                </span>
              </div>
            </div>

            <!-- Action Buttons Grid -->
            <div class="grid grid-cols-2 gap-2">
              <button *ngIf="provider.exportGuideUrl" 
                      (click)="bridge.openTab(provider.exportGuideUrl)"
                      [title]="'Open ' + provider.name + ' Export Page'"
                      class="py-1.5 px-2 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.24)] rounded-lg text-center font-mono font-medium text-[#0e0e0e] transition-colors text-[11px]">
                Export {{ provider.name }}
              </button>

              <button *ngIf="provider.id === 'letterboxd'" 
                      (click)="openLetterboxdWatchlist()"
                      title="Open Letterboxd Watchlist"
                      class="py-1.5 px-2 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-lg text-center font-mono font-medium transition-colors text-[11px] shadow-xs">
                Sync Watchlist ({{ movieWatchlistCount() }})
              </button>

              <button *ngIf="provider.id === 'storygraph'" 
                      (click)="bridge.openTab('https://app.thestorygraph.com/import-goodreads')"
                      class="py-1.5 px-2 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-lg text-center font-mono font-medium transition-colors text-[11px] shadow-xs">
                Sync StoryGraph
              </button>

              <button *ngIf="provider.id === 'letterboxd'" 
                      (click)="activeTab.set('unsynced')"
                      class="col-span-2 py-1.5 px-2 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.24)] rounded-lg text-center font-mono font-medium text-[#0e0e0e] transition-colors text-[11px]">
                Sync Diary ({{ unsyncedMovieCount() }})
              </button>
            </div>

            <!-- Provider Capability: Letterboxd RSS Feed Polling -->
            <div *ngIf="provider.capabilities.includes('rss_sync')" class="pt-2 border-t border-[rgba(14,14,14,0.14)] space-y-1.5">
              <div class="flex items-center space-x-1.5 text-[10px] text-[#3d3830] font-mono font-medium">
                <svg class="w-3 h-3 text-[#0e0e0e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z"/>
                </svg>
                <span>Poll RSS Feed</span>
              </div>

              <div class="flex space-x-1.5">
                <input type="text" [(ngModel)]="rssInputUsername" placeholder="letterboxd username"
                       (keydown.enter)="pollRss()"
                       class="flex-1 px-2.5 py-1 bg-white border border-[rgba(14,14,14,0.24)] rounded text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e] font-mono">
                <button (click)="pollRss()" [disabled]="bridge.rssState().polling"
                        class="px-2.5 py-1 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-50 text-[#f0ede6] rounded text-[11px] font-mono font-medium transition-colors shadow-xs">
                  {{ bridge.rssState().polling ? 'Polling...' : 'Poll RSS' }}
                </button>
              </div>

              <!-- RSS status message -->
              <div *ngIf="bridge.rssState().polling" class="text-[10px] font-mono text-[#9a8f7e]">
                Fetching Letterboxd RSS feed…
              </div>
              <div *ngIf="bridge.rssState().error" class="text-[10px] font-mono text-rose-700">
                {{ bridge.rssState().error }}
              </div>
              <div *ngIf="!bridge.rssState().polling && !bridge.rssState().error && bridge.rssState().totalCount > 0" class="text-[10px] font-mono text-[#3a6b3a] font-medium">
                ✓ Synced {{ bridge.rssState().newCount }} new entries ({{ bridge.rssState().totalCount }} in feed)
              </div>
            </div>

            <!-- Provider Capability: API Key Sync (Setlist.fm) -->
            <div *ngIf="provider.id === 'setlistfm'" class="space-y-2 pt-1 border-t border-[rgba(14,14,14,0.14)]">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[9px] font-mono font-bold text-[#3d3830] mb-0.5 uppercase tracking-wider">Username</label>
                  <input type="text"
                         [(ngModel)]="setlistInputUsername"
                         placeholder="e.g. username"
                         class="w-full px-2 py-1 bg-white border border-[rgba(14,14,14,0.24)] rounded-md text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e] font-mono">
                </div>
                <div>
                  <div class="flex items-center justify-between mb-0.5">
                    <label class="block text-[9px] font-mono font-bold text-[#3d3830] uppercase tracking-wider">API Key</label>
                    <a (click)="bridge.openTab('https://www.setlist.fm/settings/api')"
                       class="text-[9px] font-mono text-[#0e0e0e] hover:underline cursor-pointer">Key ↗</a>
                  </div>
                  <input type="password"
                         [(ngModel)]="setlistInputApiKey"
                         placeholder="API Key"
                         class="w-full px-2 py-1 bg-white border border-[rgba(14,14,14,0.24)] rounded-md text-[11px] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e] font-mono">
                </div>
              </div>

              <!-- Sync Button -->
              <button (click)="syncSetlist()"
                      [disabled]="bridge.setlistSyncState().syncing || !bridge.isConnected() || !setlistInputUsername.trim() || !setlistInputApiKey.trim()"
                      class="w-full py-1.5 px-3 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-50 text-[#f0ede6] font-mono font-medium rounded-lg text-xs transition-all flex items-center justify-center space-x-1.5 shadow-xs">
                <svg *ngIf="bridge.setlistSyncState().syncing" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>{{ bridge.setlistSyncState().syncing ? 'Syncing Concerts...' : 'Sync Attended Concerts' }}</span>
              </button>

              <!-- Sync State / Progress Alert -->
              <div *ngIf="bridge.setlistSyncState().syncing || bridge.setlistSyncState().error || bridge.setlistSyncState().success" 
                   class="p-2 rounded-lg text-[10px] font-mono space-y-1"
                   [ngClass]="bridge.setlistSyncState().error ? 'bg-rose-50 border border-rose-200 text-rose-800' : (bridge.setlistSyncState().success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] text-[#0e0e0e]')">
                <div class="flex items-center justify-between">
                  <span>{{ bridge.setlistSyncState().error ? 'Sync failed: ' + bridge.setlistSyncState().error : (bridge.setlistSyncState().success ? '✓ Synced ' + bridge.setlistSyncState().processed + ' concerts directly to PDS' : 'Syncing from setlist.fm...') }}</span>
                  <span *ngIf="bridge.setlistSyncState().syncing" class="font-mono font-bold">{{ bridge.setlistSyncState().processed }} / {{ bridge.setlistSyncState().total }}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- TAB 2: UNSYNCED ITEMS -->
        <div *ngIf="activeTab() === 'unsynced'" class="space-y-2.5">
          
          <!-- All Caught Up Empty State -->
          <div *ngIf="bridge.unsyncedItems().length === 0 && !bridge.loading()" class="py-10 text-center space-y-2">
            <div class="text-3xl">🎉</div>
            <p class="font-serif font-bold text-[#0e0e0e] text-xs">All Caught Up!</p>
            <p class="text-[11px] font-mono text-[#9a8f7e] max-w-xs mx-auto">
              All records in your PDS are synchronized with external platforms.
            </p>
          </div>

          <!-- Unsynced Cards -->
          <div *ngFor="let item of bridge.unsyncedItems()" 
               class="p-2.5 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-xl flex items-center justify-between space-x-2 paper-card-hover shadow-xs">
            
            <div class="flex items-center space-x-2.5 min-w-0 flex-1">
              <!-- Thumbnail / Poster -->
              <div class="w-9 h-12 rounded bg-[#f0ede6] border border-[rgba(14,14,14,0.14)] overflow-hidden shrink-0 flex items-center justify-center text-[#9a8f7e]">
                <img *ngIf="item.coverUrl" [src]="item.coverUrl" [alt]="item.title" class="w-full h-full object-cover">
                <span *ngIf="!item.coverUrl" class="text-base">{{ getTypeIcon(item.mediaType) }}</span>
              </div>

              <!-- Metadata -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center space-x-1.5 mb-0.5">
                  <span [class]="getTypeBadgeClass(item.mediaType)" class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                    {{ item.mediaType }}
                  </span>
                </div>
                <div class="font-serif font-bold text-[#0e0e0e] text-xs truncate" [title]="item.title">
                  {{ item.title }}
                </div>
                <div class="text-[10px] font-mono text-[#9a8f7e] truncate">
                  {{ getItemSubtitle(item) }}
                </div>
                <div *ngIf="item.rating" class="text-[10px] font-mono text-[#0e0e0e] mt-0.5">
                  ★ {{ item.rating }}/5
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col space-y-1 shrink-0">
              <!-- Sync Action -->
              <button *ngIf="item.mediaType === 'movie'"
                      (click)="bridge.syncMovieToLetterboxd(item)"
                      class="px-2.5 py-1 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-md text-[10px] font-mono font-medium transition-colors whitespace-nowrap shadow-xs">
                Sync to LB ↗
              </button>

              <button *ngIf="item.mediaType === 'book'"
                      (click)="bridge.syncBookToStoryGraph(item)"
                      class="px-2.5 py-1 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-md text-[10px] font-mono font-medium transition-colors whitespace-nowrap shadow-xs">
                Search SG ↗
              </button>

              <!-- Mark Synced Override Button -->
              <button (click)="bridge.markItemSynced(item)"
                      title="Mark as already synced"
                      class="px-2 py-0.5 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.18)] rounded text-[9px] text-[#3d3830] font-mono transition-colors whitespace-nowrap">
                Mark Synced
              </button>
            </div>

          </div>

        </div>

      </main>

    </div>
  `
})
export class AppComponent {
  bridge = inject(ExtensionBridgeService);

  activeTab = signal<'integrations' | 'unsynced'>('integrations');
  isSettingsOpen = signal<boolean>(false);

  authMode: 'oauth' | 'password' = 'oauth';
  pdsUrl = 'http://localhost:3000';
  handle = '';
  password = '';
  tmdbApiKey = '';
  lastfmApiKey = '';
  rssInputUsername = '';
  setlistInputUsername = '';
  setlistInputApiKey = '';

  get activeProviders(): IntegrationProvider[] {
    return getAllProviders();
  }

  constructor() {
    const config = this.bridge.config();
    this.pdsUrl = config.pdsUrl || 'http://localhost:3000';
    this.handle = config.handle || '';
    this.password = config.password || '';
    this.rssInputUsername = this.bridge.lbRssUsername() || '';
    this.setlistInputUsername = this.bridge.setlistUsername() || '';
    this.setlistInputApiKey = this.bridge.setlistApiKey() || '';

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['tmdbApiKey', 'lastfmApiKey'], data => {
        if (data?.tmdbApiKey) this.tmdbApiKey = data.tmdbApiKey;
        if (data?.lastfmApiKey) this.lastfmApiKey = data.lastfmApiKey;
      });
    }
  }

  async onTmdbKeyChange() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ tmdbApiKey: this.tmdbApiKey.trim() });
      await this.bridge.fetchAllMedia();
    }
  }

  async onLastfmKeyChange() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ lastfmApiKey: this.lastfmApiKey.trim() });
      await this.bridge.fetchAllMedia();
    }
  }

  async syncSetlist() {
    await this.bridge.syncSetlistFm(this.setlistInputUsername, this.setlistInputApiKey);
  }

  toggleSettings() {
    this.isSettingsOpen.update(v => !v);
  }

  setPresetLocal() {
    this.pdsUrl = 'http://localhost:3000';
  }

  setPresetBsky() {
    this.pdsUrl = 'https://bsky.social';
    this.handle = '';
    this.password = '';
  }

  async saveOAuth() {
    const success = await this.bridge.loginOAuth(this.handle);
    if (success) {
      this.isSettingsOpen.set(false);
    }
  }

  async savePassword() {
    const success = await this.bridge.loginPds(this.pdsUrl, this.handle, this.password);
    if (success) {
      this.isSettingsOpen.set(false);
    }
  }

  async logout() {
    await this.bridge.logout();
    this.handle = '';
    this.password = '';
  }

  async refresh() {
    await this.bridge.fetchAllMedia();
  }

  async pollRss() {
    await this.bridge.pollLetterboxdRss(this.rssInputUsername);
  }

  openLetterboxdWatchlist() {
    let user = '';
    const config = this.bridge.config();
    if (config?.handle) {
      user = config.handle.split('.')[0] || '';
    }
    if (user) {
      this.bridge.openTab(`https://letterboxd.com/${user}/watchlist/`);
    } else {
      this.bridge.openTab('https://letterboxd.com/');
    }
  }

  movieWatchlistCount(): number {
    return this.bridge.mediaItems().filter(m => m.mediaType === 'movie' && m.status === 'want_to_consume' && !m.isSynced).length;
  }

  unsyncedMovieCount(): number {
    return this.bridge.mediaItems().filter(m => m.mediaType === 'movie' && m.status === 'completed' && !m.isSynced).length;
  }

  getProviderSyncedCount(provider: IntegrationProvider): number {
    return this.bridge.mediaItems().filter(m => {
      const src = (m.source || '').toLowerCase();
      if (src === provider.id.toLowerCase()) return true;
      if (provider.id === 'letterboxd' && (src === 'letterboxd_rss' || src === 'letterboxd_1click_export')) return true;
      if (provider.id === 'setlistfm' && (src === 'setlist.fm' || src === 'setlist')) return true;
      return false;
    }).length;
  }

  getProviderUnsyncedCount(provider: IntegrationProvider): number {
    return this.bridge.mediaItems().filter(m => m.mediaType === provider.mediaType && !m.isSynced).length;
  }

  getItemSubtitle(item: ExtensionMediaItem): string {
    const dateStr = item.completedAt ? new Date(item.completedAt).toLocaleDateString() : '';
    if (item.mediaType === 'book') {
      return `${item.author ? item.author + ' • ' : ''}${dateStr || 'Logged on PDS'}`;
    }
    if (item.mediaType === 'concert') {
      return `${item.venue ? item.venue + (item.city ? ', ' + item.city : '') + ' • ' : ''}${dateStr || 'Attended'}`;
    }
    return `${item.year ? item.year + ' • ' : ''}${dateStr || 'Logged on PDS'}`;
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'book': return '📚';
      case 'movie': return '🎬';
      case 'concert': return '🎟️';
      default: return '🌟';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'book': return 'bg-[rgba(14,14,14,0.08)] text-[#0e0e0e] border border-[rgba(14,14,14,0.18)]';
      case 'movie': return 'bg-[rgba(14,14,14,0.08)] text-[#0e0e0e] border border-[rgba(14,14,14,0.18)]';
      case 'concert': return 'bg-[rgba(14,14,14,0.08)] text-[#0e0e0e] border border-[rgba(14,14,14,0.18)]';
      default: return 'bg-[rgba(14,14,14,0.08)] text-[#3d3830] border border-[rgba(14,14,14,0.14)]';
    }
  }

  onImgError(event: Event) {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }
}
