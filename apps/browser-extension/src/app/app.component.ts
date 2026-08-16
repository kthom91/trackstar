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
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-[#0e0e0e] text-[#f0ede6] flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            <span>t*</span>
          </div>
          <div>
            <h1 class="text-xs font-serif font-bold text-[#0e0e0e] leading-none">TrackStar</h1>
            <p class="text-[9px] text-[#9a8f7e] font-mono tracking-widest uppercase leading-tight mt-0.5">PDS Media Sync</p>
          </div>
        </div>

        <div class="flex items-center space-x-1.5">
          <!-- Connection Pill -->
          <span class="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors border border-[rgba(14,14,14,0.24)] bg-[#faf7f2] text-[#0e0e0e]">
            <span class="w-1.5 h-1.5 rounded-full shrink-0"
                  [ngClass]="bridge.isConnected() ? 'bg-[#5a8a5a]' : 'bg-[#9a8f7e]'"></span>
            <span class="truncate max-w-[90px]">
              {{ bridge.isConnected() ? (bridge.config().handle ? bridge.config().handle : 'Connected') : 'Offline' }}
            </span>
          </span>

          <!-- Refresh Button -->
          <button (click)="refresh()" 
                  title="Refresh PDS records"
                  class="p-1.5 text-[#3d3830] hover:text-[#0e0e0e] rounded-lg hover:bg-[rgba(14,14,14,0.06)] border border-transparent hover:border-[rgba(14,14,14,0.14)] transition-all">
            <svg class="w-3.5 h-3.5" [ngClass]="{'animate-spin': bridge.loading()}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>

          <!-- Settings Toggle Button -->
          <button (click)="toggleSettings()" 
                  title="Configure PDS Settings"
                  class="p-1.5 text-[#3d3830] hover:text-[#0e0e0e] rounded-lg hover:bg-[rgba(14,14,14,0.06)] border border-transparent hover:border-[rgba(14,14,14,0.14)] transition-all"
                  [ngClass]="{'bg-[rgba(14,14,14,0.08)] border-[rgba(14,14,14,0.24)] text-[#0e0e0e]': isSettingsOpen()}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- Settings Panel (Collapsible) -->
      <section *ngIf="isSettingsOpen()" class="p-3.5 bg-[#faf7f2] border-b border-[rgba(14,14,14,0.24)] space-y-3 shrink-0 shadow-inner">
        <h2 class="text-xs font-serif font-bold text-[#0e0e0e] tracking-tight">PDS Server Configuration</h2>
        
        <form (ngSubmit)="saveSettings()" class="space-y-2.5">
          <div>
            <label class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] mb-1 tracking-wider">PDS Endpoint URL</label>
            <input type="url" [(ngModel)]="pdsUrl" name="pdsUrl" required placeholder="http://localhost:3000"
                   class="w-full px-2.5 py-1.5 bg-white border border-[rgba(14,14,14,0.24)] rounded-lg text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e] font-mono shadow-xs transition-colors">
          </div>

          <div>
            <label class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] mb-1 tracking-wider">Handle / DID</label>
            <input type="text" [(ngModel)]="handle" name="handle" required placeholder="kentrain.trackstar.test"
                   class="w-full px-2.5 py-1.5 bg-white border border-[rgba(14,14,14,0.24)] rounded-lg text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e] font-mono shadow-xs transition-colors">
          </div>

          <div>
            <label class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] mb-1 tracking-wider">App Password / Password</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••••••"
                   class="w-full px-2.5 py-1.5 bg-white border border-[rgba(14,14,14,0.24)] rounded-lg text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e] font-mono shadow-xs transition-colors">
          </div>

          <div class="flex items-center space-x-2">
            <button type="button" (click)="setPresetLocal()" class="px-2.5 py-1 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.24)] rounded-md text-[10px] font-mono text-[#3d3830] hover:text-[#0e0e0e] transition-colors">
              Local (:3000)
            </button>
            <button type="button" (click)="setPresetBsky()" class="px-2.5 py-1 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.24)] rounded-md text-[10px] font-mono text-[#3d3830] hover:text-[#0e0e0e] transition-colors">
              Bluesky
            </button>
          </div>

          <button type="submit" [disabled]="bridge.loading()" 
                  class="w-full py-1.5 px-3 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-50 text-[#f0ede6] font-mono font-medium rounded-lg text-xs shadow-sm transition-all">
            {{ bridge.loading() ? 'Connecting...' : 'Connect to PDS' }}
          </button>

          <div *ngIf="bridge.error()" class="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-mono">
            {{ bridge.error() }}
          </div>
        </form>
      </section>

      <!-- Navigation Tabs -->
      <nav class="flex border-b border-[rgba(14,14,14,0.14)] bg-[#faf7f2] shrink-0">
        <button (click)="activeTab.set('integrations')"
                [ngClass]="activeTab() === 'integrations' ? 'border-b-2 border-[#0e0e0e] text-[#0e0e0e] font-bold bg-[#f0ede6]/50' : 'text-[#3d3830] hover:text-[#0e0e0e]'"
                class="flex-1 py-2 text-center text-xs font-mono transition-colors">
          Integrations
        </button>
        <button (click)="activeTab.set('unsynced')"
                [ngClass]="activeTab() === 'unsynced' ? 'border-b-2 border-[#0e0e0e] text-[#0e0e0e] font-bold bg-[#f0ede6]/50' : 'text-[#3d3830] hover:text-[#0e0e0e]'"
                class="flex-1 py-2 text-center text-xs font-mono transition-colors flex items-center justify-center space-x-1.5">
          <span>Unsynced Items</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono transition-colors"
                [ngClass]="bridge.unsyncedCount() > 0 ? 'bg-[#0e0e0e] text-[#f0ede6]' : 'bg-[rgba(14,14,14,0.08)] text-[#9a8f7e]'">
            {{ bridge.unsyncedCount() }}
          </span>
        </button>
      </nav>

      <!-- Main Content Area (Scrollable) -->
      <main class="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f0ede6]">
        
        <!-- Loading State -->
        <div *ngIf="bridge.loading() && bridge.mediaItems().length === 0" class="flex flex-col items-center justify-center py-12 space-y-2">
          <div class="w-5 h-5 border-2 border-[rgba(14,14,14,0.18)] border-t-[#0e0e0e] rounded-full animate-spin"></div>
          <p class="text-[11px] font-mono text-[#9a8f7e]">Fetching records from PDS...</p>
        </div>

        <!-- Disconnected Warning Banner -->
        <div *ngIf="!bridge.isConnected() && !isSettingsOpen()" class="p-3.5 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-xl text-center space-y-2 shadow-xs">
          <p class="font-serif font-bold text-[#0e0e0e] text-xs">PDS Connection Needed</p>
          <p class="text-[11px] font-mono text-[#3d3830]">Connect your PDS credentials to view integrations and sync records.</p>
          <button (click)="isSettingsOpen.set(true)" class="px-3 py-1.5 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] font-mono font-medium rounded-lg text-xs transition-all shadow-xs">
            Open Settings
          </button>
        </div>

        <!-- TAB 1: INTEGRATIONS -->
        <div *ngIf="activeTab() === 'integrations'" class="space-y-3">
          
          <!-- Letterboxd Card -->
          <div class="p-3 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-xl space-y-2.5 shadow-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 border border-[rgba(14,14,14,0.14)]">
                  <img src="icons/services/letterboxd_favicon.png" alt="Letterboxd" class="w-5 h-5 object-contain" (error)="onImgError($event)">
                </div>
                <div class="min-w-0">
                  <div class="font-serif font-bold text-[#0e0e0e] text-xs">Letterboxd</div>
                  <div class="text-[10px] font-mono text-[#9a8f7e]">Movies & Diary</div>
                </div>
              </div>

              <!-- Top Right Status Indicators -->
              <div class="flex items-center space-x-1.5 shrink-0 text-[10px] font-mono">
                <span class="px-2 py-0.5 rounded-full bg-[rgba(90,138,90,0.12)] text-[#3a6b3a] border border-[rgba(90,138,90,0.3)] font-medium"
                      title="Synced with Letterboxd">
                  {{ getSyncedCount('movie') }} synced
                </span>
                <span *ngIf="getUnsyncedCount('movie') > 0"
                      class="px-2 py-0.5 rounded-full bg-[rgba(14,14,14,0.06)] text-[#3d3830] border border-[rgba(14,14,14,0.18)] font-medium"
                      title="Unsynced movies">
                  {{ getUnsyncedCount('movie') }} unsynced
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button (click)="bridge.openTab('https://letterboxd.com/settings/data/')"
                      title="Open Letterboxd Account Data export page"
                      class="py-1.5 px-2 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.24)] rounded-lg text-center font-mono font-medium text-[#0e0e0e] transition-colors text-[11px]">
                Export Letterboxd
              </button>
              <button (click)="openLetterboxdWatchlist()"
                      title="Open Letterboxd Watchlist"
                      class="py-1.5 px-2 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-lg text-center font-mono font-medium transition-colors text-[11px] shadow-xs">
                Sync Watchlist ({{ movieWatchlistCount() }})
              </button>
            </div>

            <button (click)="activeTab.set('unsynced')"
                    class="w-full py-1.5 px-2 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.24)] rounded-lg text-center font-mono font-medium text-[#0e0e0e] transition-colors text-[11px]">
              Sync Diary ({{ unsyncedMovieCount() }})
            </button>

            <!-- Letterboxd RSS Section -->
            <div class="pt-2 border-t border-[rgba(14,14,14,0.14)] space-y-1.5">
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
          </div>

          <!-- StoryGraph Card -->
          <div class="p-3 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-xl space-y-2.5 shadow-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 border border-[rgba(14,14,14,0.14)]">
                  <img src="icons/services/storygraph.png" alt="StoryGraph" class="w-5 h-5 object-contain" (error)="onImgError($event)">
                </div>
                <div class="min-w-0">
                  <div class="font-serif font-bold text-[#0e0e0e] text-xs">StoryGraph</div>
                  <div class="text-[10px] font-mono text-[#9a8f7e]">Books & Reading</div>
                </div>
              </div>

              <!-- Top Right Status Indicators -->
              <div class="flex items-center space-x-1.5 shrink-0 text-[10px] font-mono">
                <span class="px-2 py-0.5 rounded-full bg-[rgba(90,138,90,0.12)] text-[#3a6b3a] border border-[rgba(90,138,90,0.3)] font-medium"
                      title="Synced with StoryGraph">
                  {{ getSyncedCount('book') }} synced
                </span>
                <span *ngIf="getUnsyncedCount('book') > 0"
                      class="px-2 py-0.5 rounded-full bg-[rgba(14,14,14,0.06)] text-[#3d3830] border border-[rgba(14,14,14,0.18)] font-medium"
                      title="Unsynced books">
                  {{ getUnsyncedCount('book') }} unsynced
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button (click)="bridge.openTab('https://app.thestorygraph.com/user-export')"
                      class="py-1.5 px-2 bg-[#f0ede6] hover:bg-[rgba(14,14,14,0.08)] border border-[rgba(14,14,14,0.24)] rounded-lg text-center font-mono font-medium text-[#0e0e0e] transition-colors text-[11px]">
                Export StoryGraph
              </button>
              <button (click)="bridge.openTab('https://app.thestorygraph.com/import-goodreads')"
                      class="py-1.5 px-2 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-lg text-center font-mono font-medium transition-colors text-[11px] shadow-xs">
                Sync StoryGraph
              </button>
            </div>
          </div>

          <!-- setlist.fm Card -->
          <div class="p-3 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-xl space-y-2.5 shadow-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 border border-[rgba(14,14,14,0.14)]">
                  <img src="icons/services/setlistfm.png" alt="setlist.fm" class="w-5 h-5 object-contain" (error)="onImgError($event)">
                </div>
                <div class="min-w-0">
                  <div class="font-serif font-bold text-[#0e0e0e] text-xs">setlist.fm</div>
                  <div class="text-[10px] font-mono text-[#9a8f7e]">Concerts & Live Shows</div>
                </div>
              </div>

              <!-- Top Right Status Indicators -->
              <div class="flex items-center space-x-1.5 shrink-0 text-[10px] font-mono">
                <span class="px-2 py-0.5 rounded-full bg-[rgba(90,138,90,0.12)] text-[#3a6b3a] border border-[rgba(90,138,90,0.3)] font-medium"
                      title="Synced with setlist.fm">
                  {{ getSyncedCount('concert') }} synced
                </span>
                <span *ngIf="getUnsyncedCount('concert') > 0"
                      class="px-2 py-0.5 rounded-full bg-[rgba(14,14,14,0.06)] text-[#3d3830] border border-[rgba(14,14,14,0.18)] font-medium"
                      title="Unsynced concerts">
                  {{ getUnsyncedCount('concert') }} unsynced
                </span>
              </div>
            </div>

            <!-- Setlist Credentials Inputs & Sync Action -->
            <div class="space-y-2 pt-1 border-t border-[rgba(14,14,14,0.14)]">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[9px] font-mono font-bold text-[#3d3830] mb-0.5 uppercase tracking-wider">Username</label>
                  <input type="text"
                         [(ngModel)]="setlistInputUsername"
                         placeholder="e.g. kentrain"
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

            <!-- Action Button -->
            <div class="shrink-0 flex items-center space-x-1.5 font-mono">
              <a *ngIf="item.mediaType === 'movie'"
                 [href]="bridge.getLetterboxdReviewUrl(item)" target="_blank"
                 class="px-2.5 py-1 bg-[#f0ede6] hover:bg-[#0e0e0e] hover:text-[#f0ede6] text-[#0e0e0e] border border-[rgba(14,14,14,0.24)] rounded text-[10px] font-medium inline-flex items-center space-x-0.5 cursor-pointer transition-all shadow-xs">
                <span>Letterboxd</span>
                <span>↗</span>
              </a>

              <a *ngIf="item.mediaType === 'concert'"
                 [href]="bridge.getSetlistConcertUrl(item)" target="_blank"
                 class="px-2.5 py-1 bg-[#f0ede6] hover:bg-[#0e0e0e] hover:text-[#f0ede6] text-[#0e0e0e] border border-[rgba(14,14,14,0.24)] rounded text-[10px] font-medium inline-flex items-center space-x-0.5 cursor-pointer transition-all shadow-xs">
                <span>setlist.fm</span>
                <span>↗</span>
              </a>

              <a *ngIf="item.mediaType === 'book'"
                 (click)="bridge.openTab('https://app.thestorygraph.com/import-goodreads')"
                 class="px-2.5 py-1 bg-[#f0ede6] hover:bg-[#0e0e0e] hover:text-[#f0ede6] text-[#0e0e0e] border border-[rgba(14,14,14,0.24)] rounded text-[10px] font-medium inline-flex items-center space-x-0.5 cursor-pointer transition-all shadow-xs">
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
