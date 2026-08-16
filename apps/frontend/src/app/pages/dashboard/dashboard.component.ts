import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PdsRepositoryService } from '../../services/pds-repo.service';
import { PdsAuthService } from '../../services/pds-auth.service';
import { ModalService } from '../../services/modal.service';
import { PdsUserLog, YearGroup } from '@trackstar/data';

export type { YearGroup };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-4 sm:gap-5">
      
      <!-- Unauthenticated Banner -->
      <div *ngIf="!auth.isAuthenticated()" class="bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div class="space-y-1 text-center sm:text-left">
          <h3 class="text-base font-serif font-bold text-[#0e0e0e]">Connect Your AT Protocol PDS</h3>
          <p class="text-xs text-[#3d3830] font-mono">
            Sign in with your Personal Data Server (e.g. localhost:3000 or bsky.social) to view and manage your personal media records.
          </p>
        </div>
        <button (click)="openPdsConnect()" class="px-4 py-2 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-xl text-xs font-mono font-medium shadow-sm transition-all whitespace-nowrap">
          Connect PDS Account
        </button>
      </div>

      <!-- Page Header (Visible on desktop >= 1000px; hidden on compact viewports to reclaim prime vertical space) -->
      <div class="hidden nav:flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[rgba(14,14,14,0.14)] pb-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold text-[#0e0e0e] tracking-tight">Media Feed</h1>
          <p class="text-xs font-mono text-[#9a8f7e] mt-0.5">
            Your personal log of completed books, films, and concerts synced from your AT Protocol repository.
          </p>
        </div>
        <div class="font-mono text-xs text-[#9a8f7e] shrink-0">
          {{ countConsumedTotal() }} {{ countConsumedTotal() === 1 ? 'entry' : 'entries' }} logged
        </div>
      </div>

      <!-- Unified Filter & Search & View Container Bar -->
      <div class="border border-[rgba(14,14,14,0.24)] bg-[#faf7f2] rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between text-xs overflow-hidden shadow-sm">
        
        <!-- Left: Filter & Checkboxes -->
        <div class="flex items-center space-x-4 px-4 py-2.5 overflow-x-auto">
          <span class="font-mono text-xs uppercase font-bold text-[#3d3830] tracking-wider shrink-0">FILTER:</span>
          
          <!-- Books Checkbox -->
          <label class="inline-flex items-center space-x-2 font-mono text-xs text-[#0e0e0e] cursor-pointer select-none">
            <div class="w-4 h-4 rounded-[3px] border border-[rgba(14,14,14,0.24)] flex items-center justify-center transition-colors"
                 [class.bg-[#0e0e0e]]="selectedTypes.book"
                 [class.border-[#0e0e0e]]="selectedTypes.book">
              <svg *ngIf="selectedTypes.book" class="w-3 h-3 text-[#f0ede6]" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <input type="checkbox" [(ngModel)]="selectedTypes.book" (change)="onFilterChange()" class="sr-only" />
            <span class="text-[#3d3830]">Books</span>
            <span class="px-1.5 py-0.5 rounded bg-[rgba(14,14,14,0.08)] text-[#3d3830] text-[10px] font-bold font-mono">
              {{ countCurrentByType('book') }}
            </span>
          </label>

          <!-- Movies Checkbox -->
          <label class="inline-flex items-center space-x-2 font-mono text-xs text-[#0e0e0e] cursor-pointer select-none">
            <div class="w-4 h-4 rounded-[3px] border border-[rgba(14,14,14,0.24)] flex items-center justify-center transition-colors"
                 [class.bg-[#0e0e0e]]="selectedTypes.movie"
                 [class.border-[#0e0e0e]]="selectedTypes.movie">
              <svg *ngIf="selectedTypes.movie" class="w-3 h-3 text-[#f0ede6]" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <input type="checkbox" [(ngModel)]="selectedTypes.movie" (change)="onFilterChange()" class="sr-only" />
            <span class="text-[#3d3830]">Movies</span>
            <span class="px-1.5 py-0.5 rounded bg-[rgba(14,14,14,0.08)] text-[#3d3830] text-[10px] font-bold font-mono">
              {{ countCurrentByType('movie') }}
            </span>
          </label>

          <!-- Concerts Checkbox -->
          <label class="inline-flex items-center space-x-2 font-mono text-xs text-[#0e0e0e] cursor-pointer select-none">
            <div class="w-4 h-4 rounded-[3px] border border-[rgba(14,14,14,0.24)] flex items-center justify-center transition-colors"
                 [class.bg-[#0e0e0e]]="selectedTypes.concert"
                 [class.border-[#0e0e0e]]="selectedTypes.concert">
              <svg *ngIf="selectedTypes.concert" class="w-3 h-3 text-[#f0ede6]" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <input type="checkbox" [(ngModel)]="selectedTypes.concert" (change)="onFilterChange()" class="sr-only" />
            <span class="text-[#3d3830]">Concerts</span>
            <span class="px-1.5 py-0.5 rounded bg-[rgba(14,14,14,0.08)] text-[#3d3830] text-[10px] font-bold font-mono">
              {{ countCurrentByType('concert') }}
            </span>
          </label>
        </div>

        <!-- Middle: Search Input -->
        <div class="border-t md:border-t-0 md:border-l border-[rgba(14,14,14,0.14)] flex items-center px-3.5 py-2 flex-1 relative">
          <svg class="w-3.5 h-3.5 text-[#9a8f7e] shrink-0 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input type="text" 
                 [(ngModel)]="searchQuery" 
                 (input)="onFilterChange()"
                 placeholder="Search media feed..."
                 class="w-full bg-transparent placeholder-[#9a8f7e] text-[#0e0e0e] font-mono text-xs focus:outline-none" />
        </div>

        <!-- Right: View Mode (Cards vs Table) -->
        <div class="border-t md:border-t-0 md:border-l border-[rgba(14,14,14,0.14)] px-3 py-1.5 flex items-center space-x-1 shrink-0">
          <button (click)="viewMode = 'card'"
                  [class]="viewMode === 'card' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold' : 'text-[#3d3830] hover:text-[#0e0e0e] bg-transparent'"
                  class="px-2.5 py-1 rounded-md text-xs font-mono flex items-center space-x-1.5 transition-all">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
            <span>Cards</span>
          </button>
          <button (click)="viewMode = 'table'"
                  [class]="viewMode === 'table' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold' : 'text-[#3d3830] hover:text-[#0e0e0e] bg-transparent'"
                  class="px-2.5 py-1 rounded-md text-xs font-mono flex items-center space-x-1.5 transition-all">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
            </svg>
            <span>Table</span>
          </button>
        </div>

      </div>

      <!-- Loading State -->
      <div *ngIf="repo.loading() && repo.logs().length === 0" class="flex justify-center items-center py-20">
        <div class="w-8 h-8 border-2 border-[rgba(14,14,14,0.14)] border-t-[#0e0e0e] rounded-full animate-spin"></div>
      </div>

      <!-- Empty State (when not connected) -->
      <div *ngIf="!repo.loading() && repo.logs().length === 0 && !auth.isAuthenticated()" class="bg-[#faf7f2] rounded-2xl p-12 text-center border border-[rgba(14,14,14,0.24)] max-w-lg mx-auto my-12 shadow-sm">
        <div class="w-12 h-12 bg-[#0e0e0e]/5 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0e0e0e] font-bold">
          t*
        </div>
        <h3 class="text-lg font-serif font-bold text-[#0e0e0e] mb-1">Connect Your PDS</h3>
        <p class="text-[#9a8f7e] font-mono text-xs mb-4">
          Connect your AT Protocol Personal Data Server account to view and track your media.
        </p>
      </div>

      <!-- =================================================================== -->
      <!-- MEDIA FEED STREAM WITH YEAR SIDEBAR NAVIGATION                      -->
      <!-- =================================================================== -->
      <div *ngIf="yearGroups.length > 0" class="flex flex-col md:flex-row items-start gap-6 md:gap-8 pt-0">
        
        <!-- Left Column: Year Sidebar Navigation -->
        <aside class="w-full md:w-44 shrink-0 md:border-r md:border-[rgba(14,14,14,0.14)] md:pr-6 space-y-1">
          <div class="font-mono text-[10px] uppercase font-bold text-[#9a8f7e] tracking-widest px-2 mb-2">
            YEAR
          </div>

          <div class="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1 pb-2 md:pb-0">
            <button *ngFor="let group of yearGroups"
                    (click)="selectYearGroup(group)"
                    [class]="isSelectedGroup(group) ? 'bg-[#0e0e0e] text-[#f0ede6] shadow-sm' : 'text-[#0e0e0e] hover:bg-[rgba(14,14,14,0.04)]'"
                    class="p-2.5 sm:p-3 rounded-xl block text-left shrink-0 md:w-full transition-all group">
              <div class="text-base sm:text-lg font-serif font-bold leading-tight"
                   [class]="isSelectedGroup(group) ? 'text-[#f0ede6] font-black' : 'text-[#0e0e0e]'">
                {{ group.yearLabel }}
              </div>
              <div class="text-[11px] font-mono mt-0.5"
                   [class]="isSelectedGroup(group) ? 'text-[#9a8f7e]' : 'text-[#9a8f7e]'">
                {{ group.logs.length }} {{ group.logs.length === 1 ? 'entry' : 'entries' }}
              </div>
            </button>
          </div>
        </aside>

        <!-- Right Column: Active Year Content Pane -->
        <section class="flex-1 w-full min-w-0 space-y-6" *ngIf="activeYearGroup as activeGroup">
          
          <!-- Year Header Banner (Compact & Crisp) -->
          <div class="flex flex-wrap items-baseline gap-2.5 sm:gap-3 border-b border-[rgba(14,14,14,0.14)] pb-2.5 sm:pb-3">
            <h2 class="text-3xl sm:text-4xl font-serif font-black text-[#0e0e0e] tracking-tight leading-none">
              {{ activeGroup.yearLabel }}
            </h2>

            <span class="font-mono text-xs text-[#9a8f7e]">
              {{ activeGroup.logs.length }} {{ activeGroup.logs.length === 1 ? 'entry' : 'entries' }}
              <ng-container *ngIf="getYearTypeSummary(activeGroup) as summary">
                · {{ summary }}
              </ng-container>
            </span>
          </div>

          <!-- VIEW MODE 1: CARD GRID -->
          <div *ngIf="viewMode === 'card'" 
               class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            
            <div *ngFor="let log of activeGroup.logs"
                 class="border border-[rgba(14,14,14,0.24)] bg-[#faf7f2] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#0e0e0e] hover:shadow-lg transition-all group">
              
              <div>
                <!-- Top Tag / Header -->
                <div class="flex items-center justify-between px-3.5 py-2.5">
                  <span class="font-mono text-[10px] uppercase font-semibold tracking-widest text-[#9a8f7e]">
                    {{ log.mediaItem?.mediaType }}
                  </span>

                  <!-- Delete button (visible on hover) -->
                  <button (click)="deleteLog(log)"
                          title="Delete entry from PDS"
                          class="opacity-0 group-hover:opacity-100 text-[#9a8f7e] hover:text-red-700 transition-opacity p-0.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>

                <!-- Book / Poster Cover Image (Portrait 2:3 Aspect Ratio) -->
                <a [href]="getExternalUrl(log)" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="block relative overflow-hidden bg-[#0e0e0e]/5 aspect-[2/3] w-full border-y border-[rgba(14,14,14,0.08)]"
                   [title]="'View on ' + getProviderName(log.mediaItem?.mediaType)">
                  <img *ngIf="getCoverUrl(log)" 
                       [src]="getCoverUrl(log)" 
                       [alt]="log.mediaItem?.title" 
                       class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102" />
                  
                  <!-- Fallback Placeholder -->
                  <div *ngIf="!getCoverUrl(log)" 
                       class="w-full h-full bg-[#f0ede6] flex flex-col items-center justify-center p-4 text-center">
                    <span class="text-3xl mb-2 opacity-70">{{ getTypeIcon(log.mediaItem?.mediaType) }}</span>
                    <span class="text-xs font-mono text-[#3d3830] line-clamp-3 px-2">{{ log.mediaItem?.title }}</span>
                  </div>
                </a>

                <!-- Card Details Body -->
                <div class="p-3.5 space-y-1.5">
                  <!-- Title Link -->
                  <a [href]="getExternalUrl(log)" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     class="group/title block cursor-pointer"
                     [title]="'View on ' + getProviderName(log.mediaItem?.mediaType)">
                    <h3 class="font-serif font-bold text-base text-[#0e0e0e] group-hover/title:text-neutral-700 leading-snug flex items-start justify-between">
                      <span class="line-clamp-2">{{ log.mediaItem?.title }}</span>
                      <svg class="w-3.5 h-3.5 text-[#9a8f7e] group-hover/title:text-[#0e0e0e] shrink-0 ml-1.5 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </h3>
                  </a>

                  <!-- Creator / Venue Subtitle -->
                  <p *ngIf="getSubtitle(log)" class="font-mono text-xs text-[#9a8f7e] truncate">
                    {{ getSubtitle(log) }}
                  </p>

                  <!-- Date -->
                  <p class="font-mono text-xs text-[#9a8f7e]">
                    {{ (log.completedAt || log.loggedAt) | date:'mediumDate' }}
                  </p>

                  <!-- Star Rating -->
                  <div *ngIf="log.rating" class="flex items-center space-x-0.5 pt-0.5">
                    <span *ngFor="let star of [1,2,3,4,5]" 
                          [class]="star <= log.rating ? 'text-[#0e0e0e]' : 'text-[rgba(14,14,14,0.18)]'" 
                          class="text-xs">
                      ★
                    </span>
                  </div>

                  <!-- Review Quote -->
                  <p *ngIf="log.review" class="text-xs italic text-[#3d3830] bg-[rgba(14,14,14,0.04)] p-2.5 rounded-xl mt-2 font-serif border border-[rgba(14,14,14,0.14)] line-clamp-3">
                    "{{ log.review }}"
                  </p>
                </div>
              </div>

            </div>

          </div>

          <!-- VIEW MODE 2: TABLE VIEW -->
          <div *ngIf="viewMode === 'table'" class="border border-[rgba(14,14,14,0.24)] bg-[#faf7f2] rounded-xl overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left font-mono text-xs border-collapse">
                <thead class="bg-[#f0ede6] text-[#3d3830] uppercase tracking-wider font-semibold border-b border-[rgba(14,14,14,0.14)] text-[10px]">
                  <tr>
                    <th scope="col" class="py-3 px-4 w-12">Cover</th>
                    <th scope="col" class="py-3 px-4">Type</th>
                    <th scope="col" class="py-3 px-4">Title</th>
                    <th scope="col" class="py-3 px-4">Creator / Venue</th>
                    <th scope="col" class="py-3 px-4">Rating</th>
                    <th scope="col" class="py-3 px-4">Date</th>
                    <th scope="col" class="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[rgba(14,14,14,0.14)]">
                  <tr *ngFor="let log of activeGroup.logs" class="hover:bg-white/60 transition-colors">
                    
                    <td class="py-2 px-4">
                      <img *ngIf="getCoverUrl(log)" 
                           [src]="getCoverUrl(log)" 
                           [alt]="log.mediaItem?.title" 
                           class="w-8 h-10 object-cover rounded bg-[rgba(14,14,14,0.1)] border border-[rgba(14,14,14,0.14)]" />
                      <div *ngIf="!getCoverUrl(log)" class="w-8 h-10 bg-[#f0ede6] rounded flex items-center justify-center text-[10px] text-[#9a8f7e]">
                        {{ getTypeIcon(log.mediaItem?.mediaType) }}
                      </div>
                    </td>

                    <td class="py-2 px-4 uppercase text-[10px] font-semibold text-[#9a8f7e]">
                      {{ log.mediaItem?.mediaType }}
                    </td>

                    <td class="py-2 px-4 font-serif font-bold text-[#0e0e0e] max-w-xs truncate text-sm">
                      <a [href]="getExternalUrl(log)" 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         class="hover:underline inline-flex items-center space-x-1" 
                         [title]="'View on ' + getProviderName(log.mediaItem?.mediaType)">
                        <span>{{ log.mediaItem?.title }}</span>
                        <svg class="w-3 h-3 text-[#9a8f7e]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </a>
                    </td>

                    <td class="py-2 px-4 text-[#3d3830]">
                      {{ getSubtitle(log) || '—' }}
                    </td>

                    <td class="py-2 px-4 whitespace-nowrap">
                      <div *ngIf="log.rating" class="flex items-center space-x-0.5">
                        <span *ngFor="let star of [1,2,3,4,5]" 
                              [class]="star <= log.rating ? 'text-[#0e0e0e]' : 'text-[rgba(14,14,14,0.18)]'" 
                              class="text-xs">
                          ★
                        </span>
                      </div>
                      <span *ngIf="!log.rating" class="text-[#9a8f7e]">—</span>
                    </td>

                    <td class="py-2 px-4 text-[#9a8f7e] whitespace-nowrap">
                      {{ (log.completedAt || log.loggedAt) | date:'mediumDate' }}
                    </td>

                    <td class="py-2 px-4 text-right">
                      <button (click)="deleteLog(log)" class="text-[#9a8f7e] hover:text-red-700 p-1">
                        ✕
                      </button>
                    </td>

                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </section>

      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);
  modal = inject(ModalService);
  router = inject(Router);

  yearGroups: YearGroup[] = [];
  selectedYearKey: string | number | null = null;
  searchQuery = '';
  currentYear = new Date().getFullYear();
  viewMode: 'card' | 'table' = 'card';

  selectedTypes = {
    book: true,
    movie: true,
    concert: true
  };

  get activeYearGroup(): YearGroup | undefined {
    if (!this.yearGroups.length) return undefined;
    if (this.selectedYearKey !== null) {
      const found = this.yearGroups.find(g => (g.yearNumber ?? g.yearLabel) === this.selectedYearKey);
      if (found) return found;
    }
    return this.yearGroups[0];
  }

  constructor() {
    effect(() => {
      const allLogs = this.repo.logs();
      const isLoading = this.repo.loading();
      const isAuthed = this.auth.isAuthenticated();

      // Automatically route to Get Started page if authenticated with 0 records
      if (isAuthed && !isLoading && allLogs.length === 0) {
        this.router.navigate(['/get-started']);
      }

      this.processData(allLogs);
    });
  }

  ngOnInit() {
    window.addEventListener('trackstar:media-saved', () => this.syncPds());
  }

  syncPds() {
    this.repo.syncFromPds();
  }

  openPdsConnect() {
    this.modal.openPdsModal();
  }

  onFilterChange() {
    this.processData(this.repo.logs());
  }

  selectYearGroup(group: YearGroup) {
    this.selectedYearKey = group.yearNumber ?? group.yearLabel;
    this.triggerLazyEnrichment();
  }

  isSelectedGroup(group: YearGroup): boolean {
    const active = this.activeYearGroup;
    if (!active) return false;
    return (group.yearNumber ?? group.yearLabel) === (active.yearNumber ?? active.yearLabel);
  }

  getYearTypeSummary(group: YearGroup): string {
    const parts: string[] = [];
    if (group.typeCounts.book > 0) {
      parts.push(`${group.typeCounts.book} ${group.typeCounts.book === 1 ? 'Book' : 'Books'}`);
    }
    if (group.typeCounts.movie > 0) {
      parts.push(`${group.typeCounts.movie} ${group.typeCounts.movie === 1 ? 'Movie' : 'Movies'}`);
    }
    if (group.typeCounts.concert > 0) {
      parts.push(`${group.typeCounts.concert} ${group.typeCounts.concert === 1 ? 'Concert' : 'Concerts'}`);
    }
    return parts.join(', ');
  }

  processData(items: PdsUserLog[]) {
    this.processYearGroups(items);
    this.triggerLazyEnrichment();
  }

  triggerLazyEnrichment() {
    const active = this.activeYearGroup;
    if (active && active.logs) {
      this.repo.enrichItems(active.logs);
    }
  }

  processYearGroups(items: PdsUserLog[]) {
    const activeLogs = items.filter(l => l.status !== 'want_to_consume');

    const filtered = activeLogs.filter(log => {
      const type = log.mediaItem?.mediaType || 'book';
      if (type in this.selectedTypes && !this.selectedTypes[type as keyof typeof this.selectedTypes]) {
        return false;
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        const title = (log.mediaItem?.title || '').toLowerCase();
        const review = (log.review || '').toLowerCase();
        const subtitle = (this.getSubtitle(log) || '').toLowerCase();
        return title.includes(q) || review.includes(q) || subtitle.includes(q);
      }
      return true;
    });

    const map = new Map<number, PdsUserLog[]>();
    const olderLogs: PdsUserLog[] = [];

    for (const log of filtered) {
      if (log.completedAt) {
        const year = new Date(log.completedAt).getFullYear();
        if (!isNaN(year)) {
          if (!map.has(year)) {
            map.set(year, []);
          }
          map.get(year)!.push(log);
          continue;
        }
      }

      if (log.status !== 'completed') {
        if (!map.has(this.currentYear)) {
          map.set(this.currentYear, []);
        }
        map.get(this.currentYear)!.push(log);
        continue;
      }

      olderLogs.push(log);
    }

    const sortedYears = Array.from(map.keys()).sort((a, b) => b - a);

    const groups: YearGroup[] = sortedYears.map(year => {
      const yearLogs = map.get(year)!;
      return {
        yearLabel: year.toString(),
        yearNumber: year,
        logs: yearLogs,
        isExpanded: true,
        typeCounts: {
          book: yearLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'book').length,
          movie: yearLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'movie').length,
          concert: yearLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'concert').length
        }
      };
    });

    if (olderLogs.length > 0) {
      groups.push({
        yearLabel: 'Older / Undated',
        yearNumber: null,
        logs: olderLogs,
        isExpanded: true,
        typeCounts: {
          book: olderLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'book').length,
          movie: olderLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'movie').length,
          concert: olderLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'concert').length
        }
      });
    }

    this.yearGroups = groups;

    // Ensure selectedYearKey is valid
    if (this.selectedYearKey === null && groups.length > 0) {
      // Pick current year if exists, else first group
      const hasCurrent = groups.find(g => g.yearNumber === this.currentYear);
      this.selectedYearKey = hasCurrent ? hasCurrent.yearNumber : (groups[0].yearNumber ?? groups[0].yearLabel);
    }
  }

  async deleteLog(log: PdsUserLog) {
    if (confirm(`Are you sure you want to delete "${log.mediaItem?.title}" from your PDS?`)) {
      try {
        await this.repo.deleteLog(log);
      } catch (err) {
        console.error('Failed to delete log from PDS:', err);
      }
    }
  }

  countConsumedTotal(): number {
    return this.repo.logs().filter(l => l.status !== 'want_to_consume').length;
  }

  countCurrentByType(type: string): number {
    return this.repo.getStats('want_to_consume')[type] || 0;
  }

  getTypeIcon(type?: string): string {
    switch (type) {
      case 'book': return '📚';
      case 'movie': return '🎬';
      case 'concert': return '🎟️';
      default: return '🌟';
    }
  }

  getParsedMetadata(log: PdsUserLog): Record<string, any> {
    const raw = log.mediaItem?.metadataJson;
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw;
  }

  getCoverUrl(log: PdsUserLog): string | null {
    const meta = this.getParsedMetadata(log);
    const direct = meta['coverUrl'] || 
                   meta['cover_url'] || 
                   meta['poster_url'] || 
                   meta['posterUrl'] || 
                   meta['image_url'] || 
                   (log.mediaItem as any)?.['coverUrl'] || 
                   (log as any)?.['coverUrl'];
    if (direct) return direct;

    const id = log.mediaItemId || log.mediaItem?.id || '';
    if (id.startsWith('isbn:')) {
      const cleanIsbn = id.replace('isbn:', '').replace(/[^0-9X]/gi, '');
      if (cleanIsbn.length >= 10) {
        return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;
      }
    }
    if (meta['isbn']) {
      const cleanIsbn = String(meta['isbn']).replace(/[^0-9X]/gi, '');
      if (cleanIsbn.length >= 10) {
        return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;
      }
    }
    return null;
  }

  getSubtitle(log: PdsUserLog): string | null {
    const meta = this.getParsedMetadata(log);

    if (log.mediaItem?.mediaType === 'book') {
      return meta['creator'] || meta['author'] ? `by ${meta['creator'] || meta['author']}` : null;
    }
    if (log.mediaItem?.mediaType === 'movie') {
      return meta['creator'] || meta['director'] ? `dir. ${meta['creator'] || meta['director']}` : (meta['year'] ? `(${meta['year']})` : null);
    }
    if (log.mediaItem?.mediaType === 'concert') {
      const venue = meta['venue'] || '';
      const city = meta['city'] || '';
      return [venue, city].filter(Boolean).join(', ') || null;
    }
    return null;
  }

  getExternalUrl(log: PdsUserLog): string {
    const meta = this.getParsedMetadata(log);
    const type = log.mediaItem?.mediaType;
    const title = log.mediaItem?.title || '';

    if (type === 'concert') {
      if (meta['lastfm_url']) return meta['lastfm_url'];
      if (meta['url']) return meta['url'];
      if (meta['externalUrl']) return meta['externalUrl'];
      const cleanTitle = title.split(' @ ')[0].split(' at ')[0].trim();
      return `https://www.last.fm/music/${encodeURIComponent(cleanTitle)}`;
    }

    if (type === 'movie') {
      if (meta['letterboxd_url']) return meta['letterboxd_url'];
      const cleanTitle = title.replace(/\s*\(\d{4}\)$/, '').trim();
      return `https://letterboxd.com/search/${encodeURIComponent(cleanTitle)}/`;
    }

    if (type === 'book') {
      if (meta['isbn']) {
        return `https://app.thestorygraph.com/browse?search_term=${encodeURIComponent(meta['isbn'])}`;
      }
      return `https://app.thestorygraph.com/browse?search_term=${encodeURIComponent(title)}`;
    }

    return '#';
  }

  getProviderName(type?: string): string {
    switch (type) {
      case 'book': return 'StoryGraph';
      case 'movie': return 'Letterboxd';
      case 'concert': return 'Last.fm';
      default: return 'External Provider';
    }
  }
}
