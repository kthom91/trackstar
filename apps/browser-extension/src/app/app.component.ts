import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtensionBridgeService } from './services/extension-bridge.service';
import { ExtensionMediaItem } from '@trackstar/data';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-screen max-h-[580px] bg-[#0b0f19] text-gray-100 text-xs">
      
      <!-- Top Header -->
      <header class="flex items-center justify-between px-4 py-3 bg-[#131b2e] border-b border-white/10 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/25">
            <span class="text-white font-black text-xs">t*</span>
          </div>
          <div>
            <h1 class="text-xs font-bold text-white leading-none">Trackstar</h1>
            <p class="text-[10px] text-gray-400 font-mono leading-tight mt-0.5">PDS Media Sync</p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <!-- Connection Pill -->
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                [ngClass]="bridge.isConnected() ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'">
            {{ bridge.isConnected() ? (bridge.config().handle ? '● ' + bridge.config().handle : '● Connected') : '○ Disconnected' }}
          </span>

          <!-- Refresh Button -->
          <button (click)="refresh()" 
                  title="Refresh PDS records"
                  class="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition-colors">
            <svg class="w-3.5 h-3.5" [ngClass]="{'animate-spin': bridge.loading()}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>

          <!-- Settings Toggle Button -->
          <button (click)="toggleSettings()" 
                  title="Configure PDS Settings"
                  class="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                  [ngClass]="{'text-indigo-400 bg-white/5': isSettingsOpen()}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- Settings Panel (Collapsible) -->
      <section *ngIf="isSettingsOpen()" class="p-3.5 bg-[#131b2e]/95 border-b border-white/10 space-y-3 shrink-0">
        <h2 class="text-xs font-bold text-white tracking-wide">PDS Server Configuration</h2>
        
        <form (ngSubmit)="saveSettings()" class="space-y-2.5">
          <div>
            <label class="block text-[10px] text-gray-400 mb-1 font-medium">PDS Endpoint URL</label>
            <input type="url" [(ngModel)]="pdsUrl" name="pdsUrl" required placeholder="http://localhost:3000"
                   class="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-[10px] text-gray-400 mb-1 font-medium">Handle / DID</label>
            <input type="text" [(ngModel)]="handle" name="handle" required placeholder="kentrain.trackstar.test"
                   class="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-[10px] text-gray-400 mb-1 font-medium">App Password / Password</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••••••"
                   class="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div class="flex items-center space-x-2">
            <button type="button" (click)="setPresetLocal()" class="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-gray-300 transition-colors">
              Local (:3000)
            </button>
            <button type="button" (click)="setPresetBsky()" class="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-gray-300 transition-colors">
              Bluesky
            </button>
          </div>

          <button type="submit" [disabled]="bridge.loading()" 
                  class="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs shadow-md shadow-indigo-600/30 transition-all">
            {{ bridge.loading() ? 'Connecting...' : 'Connect to PDS' }}
          </button>

          <div *ngIf="bridge.error()" class="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-[10px]">
            {{ bridge.error() }}
          </div>
        </form>
      </section>

      <!-- Navigation Tabs -->
      <nav class="flex border-b border-white/10 bg-[#131b2e]/60 shrink-0">
        <button (click)="activeTab.set('integrations')"
                [ngClass]="activeTab() === 'integrations' ? 'border-b-2 border-indigo-500 text-indigo-400 bg-white/5 font-semibold' : 'text-gray-400 hover:text-gray-200'"
                class="flex-1 py-2 text-center text-xs transition-colors">
          Integrations
        </button>
        <button (click)="activeTab.set('unsynced')"
                [ngClass]="activeTab() === 'unsynced' ? 'border-b-2 border-indigo-500 text-indigo-400 bg-white/5 font-semibold' : 'text-gray-400 hover:text-gray-200'"
                class="flex-1 py-2 text-center text-xs transition-colors flex items-center justify-center space-x-1.5">
          <span>Unsynced Items</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                [ngClass]="bridge.unsyncedCount() > 0 ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/10 text-gray-400'">
            {{ bridge.unsyncedCount() }}
          </span>
        </button>
      </nav>

      <!-- Main Content Area (Scrollable) -->
      <main class="flex-1 overflow-y-auto p-3 space-y-3">
        
        <!-- Loading State -->
        <div *ngIf="bridge.loading() && bridge.mediaItems().length === 0" class="flex flex-col items-center justify-center py-12 space-y-2">
          <div class="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p class="text-[11px] text-gray-400">Fetching records from PDS...</p>
        </div>

        <!-- Disconnected Warning Banner -->
        <div *ngIf="!bridge.isConnected() && !isSettingsOpen()" class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-2">
          <p class="font-bold text-amber-300 text-xs">PDS Connection Needed</p>
          <p class="text-[11px] text-gray-300">Connect your PDS credentials to view integrations and sync records.</p>
          <button (click)="isSettingsOpen.set(true)" class="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs">
            Open Settings
          </button>
        </div>

        <!-- TAB 1: INTEGRATIONS -->
        <div *ngIf="activeTab() === 'integrations'" class="space-y-3">
          
          <!-- Letterboxd Card -->
          <div class="p-3 bg-[#131b2e]/60 border border-white/10 rounded-xl space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-[#202830] flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                  <img src="icons/services/letterboxd_favicon.png" alt="Letterboxd" class="w-5 h-5 object-contain" (error)="onImgError($event)">
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-white text-xs">Letterboxd</div>
                  <div class="text-[10px] text-gray-400">Movies & Diary</div>
                </div>
              </div>

              <!-- Top Right Status Indicators -->
              <div class="flex items-center space-x-1.5 shrink-0 text-[10px]">
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                      title="Synced with Letterboxd">
                  {{ getSyncedCount('movie') }} synced
                </span>
                <span *ngIf="getUnsyncedCount('movie') > 0"
                      class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                      title="Unsynced movies">
                  {{ getUnsyncedCount('movie') }} unsynced
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button (click)="bridge.openTab('https://letterboxd.com/settings/data/')"
                      title="Open Letterboxd Account Data export page"
                      class="py-1.5 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center font-medium text-gray-200 hover:text-white transition-colors">
                Export Letterboxd
              </button>
              <button (click)="openLetterboxdWatchlist()"
                      title="Open Letterboxd Watchlist"
                      class="py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-center font-medium transition-colors">
                Sync Watchlist ({{ movieWatchlistCount() }})
              </button>
            </div>

            <button (click)="activeTab.set('unsynced')"
                    class="w-full py-1.5 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center font-medium text-gray-300 hover:text-white transition-colors text-[11px]">
              Sync Diary ({{ unsyncedMovieCount() }})
            </button>

            <!-- Letterboxd RSS Section -->
            <div class="pt-2 border-t border-white/5 space-y-1.5">
              <div class="flex items-center space-x-1.5 text-[10px] text-gray-400 font-medium">
                <svg class="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z"/>
                </svg>
                <span>Poll RSS Feed</span>
              </div>

              <div class="flex space-x-1.5">
                <input type="text" [(ngModel)]="rssInputUsername" placeholder="letterboxd username"
                       (keydown.enter)="pollRss()"
                       class="flex-1 px-2 py-1 bg-[#0b0f19] border border-white/10 rounded text-[11px] text-white focus:outline-none focus:border-indigo-500">
                <button (click)="pollRss()" [disabled]="bridge.rssState().polling"
                        class="px-2.5 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded text-[11px] font-medium transition-colors">
                  {{ bridge.rssState().polling ? 'Polling...' : 'Poll RSS' }}
                </button>
              </div>

              <!-- RSS status message -->
              <div *ngIf="bridge.rssState().polling" class="text-[10px] text-indigo-300">
                Fetching Letterboxd RSS feed…
              </div>
              <div *ngIf="bridge.rssState().error" class="text-[10px] text-red-400">
                {{ bridge.rssState().error }}
              </div>
              <div *ngIf="!bridge.rssState().polling && !bridge.rssState().error && bridge.rssState().totalCount > 0" class="text-[10px] text-emerald-400">
                ✓ Synced {{ bridge.rssState().newCount }} new entries ({{ bridge.rssState().totalCount }} in feed)
              </div>
            </div>
          </div>

          <!-- StoryGraph Card -->
          <div class="p-3 bg-[#131b2e]/60 border border-white/10 rounded-xl space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-[#2b3a4a] flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                  <img src="icons/services/storygraph.png" alt="StoryGraph" class="w-5 h-5 object-contain" (error)="onImgError($event)">
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-white text-xs">StoryGraph</div>
                  <div class="text-[10px] text-gray-400">Books & Reading</div>
                </div>
              </div>

              <!-- Top Right Status Indicators -->
              <div class="flex items-center space-x-1.5 shrink-0 text-[10px]">
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                      title="Synced with StoryGraph">
                  {{ getSyncedCount('book') }} synced
                </span>
                <span *ngIf="getUnsyncedCount('book') > 0"
                      class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                      title="Unsynced books">
                  {{ getUnsyncedCount('book') }} unsynced
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button (click)="bridge.openTab('https://app.thestorygraph.com/user-export')"
                      class="py-1.5 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center font-medium text-gray-200 hover:text-white transition-colors">
                Export StoryGraph
              </button>
              <button (click)="bridge.openTab('https://app.thestorygraph.com/import-goodreads')"
                      class="py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-center font-medium transition-colors">
                Sync StoryGraph
              </button>
            </div>
          </div>

          <!-- setlist.fm Card -->
          <div class="p-3 bg-[#131b2e]/60 border border-white/10 rounded-xl space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-[#1a2b22] flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                  <img src="icons/services/setlistfm.png" alt="setlist.fm" class="w-5 h-5 object-contain" (error)="onImgError($event)">
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-white text-xs">setlist.fm</div>
                  <div class="text-[10px] text-gray-400">Concerts & Live Shows</div>
                </div>
              </div>

              <!-- Top Right Status Indicators -->
              <div class="flex items-center space-x-1.5 shrink-0 text-[10px]">
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                      title="Synced with setlist.fm">
                  {{ getSyncedCount('concert') }} synced
                </span>
                <span *ngIf="getUnsyncedCount('concert') > 0"
                      class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                      title="Unsynced concerts">
                  {{ getUnsyncedCount('concert') }} unsynced
                </span>
              </div>
            </div>

            <!-- Setlist Credentials Inputs & Sync Action -->
            <div class="space-y-2 pt-1 border-t border-white/5">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[9px] text-gray-400 mb-0.5 font-medium uppercase tracking-wider">Username</label>
                  <input type="text"
                         [(ngModel)]="setlistInputUsername"
                         placeholder="e.g. kentrain"
                         class="w-full px-2 py-1 bg-[#0b0f19] border border-white/10 rounded-md text-[11px] text-white focus:outline-none focus:border-emerald-500 font-mono">
                </div>
                <div>
                  <div class="flex items-center justify-between mb-0.5">
                    <label class="block text-[9px] text-gray-400 font-medium uppercase tracking-wider">API Key</label>
                    <a (click)="bridge.openTab('https://www.setlist.fm/settings/api')"
                       class="text-[9px] text-emerald-400 hover:underline cursor-pointer">Key ↗</a>
                  </div>
                  <input type="password"
                         [(ngModel)]="setlistInputApiKey"
                         placeholder="API Key"
                         class="w-full px-2 py-1 bg-[#0b0f19] border border-white/10 rounded-md text-[11px] text-white focus:outline-none focus:border-emerald-500 font-mono">
                </div>
              </div>

              <!-- Sync Button -->
              <button (click)="syncSetlist()"
                      [disabled]="bridge.setlistSyncState().syncing || !bridge.isConnected() || !setlistInputUsername.trim() || !setlistInputApiKey.trim()"
                      class="w-full py-1.5 px-3 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20">
                <svg *ngIf="bridge.setlistSyncState().syncing" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>{{ bridge.setlistSyncState().syncing ? 'Syncing Concerts...' : 'Sync Attended Concerts' }}</span>
              </button>

              <!-- Sync State / Progress Alert -->
              <div *ngIf="bridge.setlistSyncState().syncing || bridge.setlistSyncState().error || bridge.setlistSyncState().success" 
                   class="p-2 rounded-lg text-[10px] space-y-1"
                   [ngClass]="bridge.setlistSyncState().error ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' : (bridge.setlistSyncState().success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300')">
                <div class="flex items-center justify-between">
                  <span>{{ bridge.setlistSyncState().error ? 'Sync failed: ' + bridge.setlistSyncState().error : (bridge.setlistSyncState().success ? '✓ Synced ' + bridge.setlistSyncState().processed + ' concerts directly to PDS' : 'Syncing from setlist.fm...') }}</span>
                  <span *ngIf="bridge.setlistSyncState().syncing" class="font-mono">{{ bridge.setlistSyncState().processed }} / {{ bridge.setlistSyncState().total }}</span>
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
            <p class="font-bold text-white text-xs">All Caught Up!</p>
            <p class="text-[11px] text-gray-400 max-w-xs mx-auto">
              All records in your PDS are synchronized with external platforms.
            </p>
          </div>

          <!-- Unsynced Cards -->
          <div *ngFor="let item of bridge.unsyncedItems()" 
               class="p-2.5 bg-[#131b2e]/60 border border-white/10 rounded-xl flex items-center justify-between space-x-2 hover:bg-[#131b2e] transition-colors">
            
            <div class="flex items-center space-x-2.5 min-w-0 flex-1">
              <!-- Thumbnail / Poster -->
              <div class="w-9 h-12 rounded bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                <img *ngIf="item.coverUrl" [src]="item.coverUrl" [alt]="item.title" class="w-full h-full object-cover">
                <span *ngIf="!item.coverUrl" class="text-base">{{ getTypeIcon(item.mediaType) }}</span>
              </div>

              <!-- Metadata -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center space-x-1.5 mb-0.5">
                  <span [class]="getTypeBadgeClass(item.mediaType)" class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider">
                    {{ item.mediaType }}
                  </span>
                </div>
                <div class="font-bold text-white text-xs truncate" [title]="item.title">
                  {{ item.title }}
                </div>
                <div class="text-[10px] text-gray-400 truncate">
                  {{ getItemSubtitle(item) }}
                </div>
                <div *ngIf="item.rating" class="text-[10px] text-amber-400 mt-0.5">
                  ★ {{ item.rating }}/5
                </div>
              </div>
            </div>

            <!-- Action Button -->
            <div class="shrink-0 flex items-center space-x-1.5">
              <a *ngIf="item.mediaType === 'movie'"
                 [href]="bridge.getLetterboxdReviewUrl(item)" target="_blank"
                 class="px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-200 rounded text-[10px] font-medium inline-flex items-center space-x-0.5 cursor-pointer transition-all">
                <span>Letterboxd</span>
                <span>↗</span>
              </a>

              <a *ngIf="item.mediaType === 'concert'"
                 [href]="bridge.getSetlistConcertUrl(item)" target="_blank"
                 class="px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-200 rounded text-[10px] font-medium inline-flex items-center space-x-0.5 cursor-pointer transition-all">
                <span>setlist.fm</span>
                <span>↗</span>
              </a>

              <a *ngIf="item.mediaType === 'book'"
                 (click)="bridge.openTab('https://app.thestorygraph.com/import-goodreads')"
                 class="px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-200 rounded text-[10px] font-medium inline-flex items-center space-x-0.5 cursor-pointer transition-all">
                <span>StoryGraph</span>
                <span>↗</span>
              </a>
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

  pdsUrl = 'http://localhost:3000';
  handle = 'kentrain.trackstar.test';
  password = 'password123';
  rssInputUsername = '';
  setlistInputUsername = '';
  setlistInputApiKey = '';

  constructor() {
    const config = this.bridge.config();
    this.pdsUrl = config.pdsUrl || 'http://localhost:3000';
    this.handle = config.handle || '';
    this.password = config.password || '';
    this.rssInputUsername = this.bridge.lbRssUsername() || '';
    this.setlistInputUsername = this.bridge.setlistUsername() || '';
    this.setlistInputApiKey = this.bridge.setlistApiKey() || '';
  }

  async syncSetlist() {
    await this.bridge.syncSetlistFm(this.setlistInputUsername, this.setlistInputApiKey);
  }

  toggleSettings() {
    this.isSettingsOpen.update(v => !v);
  }

  setPresetLocal() {
    this.pdsUrl = 'http://localhost:3000';
    this.handle = 'kentrain.trackstar.test';
    this.password = 'password123';
  }

  setPresetBsky() {
    this.pdsUrl = 'https://bsky.social';
    this.handle = '';
    this.password = '';
  }

  async saveSettings() {
    const success = await this.bridge.loginPds(this.pdsUrl, this.handle, this.password);
    if (success) {
      this.isSettingsOpen.set(false);
    }
  }

  async refresh() {
    await this.bridge.fetchAllMedia();
  }

  async pollRss() {
    await this.bridge.pollLetterboxdRss(this.rssInputUsername);
  }

  openLetterboxdWatchlist() {
    let user = 'kentrain';
    const config = this.bridge.config();
    if (config?.handle) {
      user = config.handle.split('.')[0] || 'kentrain';
    }
    this.bridge.openTab(`https://letterboxd.com/${user}/watchlist/`);
  }

  movieWatchlistCount(): number {
    return this.bridge.mediaItems().filter(m => m.mediaType === 'movie' && m.status === 'want_to_consume' && !m.isSynced).length;
  }

  unsyncedMovieCount(): number {
    return this.bridge.mediaItems().filter(m => m.mediaType === 'movie' && m.status === 'completed' && !m.isSynced).length;
  }

  getSyncedCount(type: string): number {
    return this.bridge.mediaItems().filter(m => m.mediaType === type && m.isSynced).length;
  }

  getUnsyncedCount(type: string): number {
    return this.bridge.mediaItems().filter(m => m.mediaType === type && !m.isSynced).length;
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
      case 'book': return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      case 'movie': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'concert': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  }

  onImgError(event: Event) {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }
}
