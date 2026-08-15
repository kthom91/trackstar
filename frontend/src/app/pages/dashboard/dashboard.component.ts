import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdsRepositoryService, PdsUserLog } from '../../services/pds-repo.service';
import { PdsAuthService } from '../../services/pds-auth.service';
import { ModalService } from '../../services/modal.service';
import { GetStartedComponent } from '../get-started/get-started.component';

export interface YearGroup {
  yearLabel: string;
  yearNumber: number | null;
  logs: PdsUserLog[];
  isExpanded: boolean;
  typeCounts: {
    book: number;
    movie: number;
    concert: number;
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, GetStartedComponent],
  template: `
    <div class="space-y-8">
      
      <!-- Unauthenticated Banner -->
      <div *ngIf="!auth.isAuthenticated()" class="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-pink-900/30 border border-indigo-500/30 rounded-2xl p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="space-y-1 text-center sm:text-left">
          <h3 class="text-base font-bold text-white">Connect Your AT Protocol PDS</h3>
          <p class="text-xs text-gray-300">
            Sign in with your Personal Data Server (e.g. localhost:3000 or bsky.social) to view and manage your personal media records.
          </p>
        </div>
        <button (click)="openPdsConnect()" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all whitespace-nowrap">
          Connect PDS Account
        </button>
      </div>

      <!-- Controls Bar: Checkbox Filters, Search Input & View Mode Toggle -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        
        <!-- Media Type Checkboxes Group with Inline Totals -->
        <div class="flex items-center space-x-4 bg-[#131b2e]/60 p-3 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto">
          <span class="text-xs text-gray-400 font-semibold uppercase tracking-wider px-1">Filter:</span>
          
          <label class="inline-flex items-center space-x-2 text-xs font-medium text-gray-300 hover:text-white cursor-pointer select-none">
            <input type="checkbox" 
                   [(ngModel)]="selectedTypes.book" 
                   (change)="onFilterChange()"
                   class="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
            <span>Books</span>
            <span class="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">{{ countByType('book') }}</span>
          </label>

          <label class="inline-flex items-center space-x-2 text-xs font-medium text-gray-300 hover:text-white cursor-pointer select-none">
            <input type="checkbox" 
                   [(ngModel)]="selectedTypes.movie" 
                   (change)="onFilterChange()"
                   class="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-600 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
            <span>Movies</span>
            <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px]">{{ countByType('movie') }}</span>
          </label>

          <label class="inline-flex items-center space-x-2 text-xs font-medium text-gray-300 hover:text-white cursor-pointer select-none">
            <input type="checkbox" 
                   [(ngModel)]="selectedTypes.concert" 
                   (change)="onFilterChange()"
                   class="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
            <span>Concerts</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px]">{{ countByType('concert') }}</span>
          </label>
        </div>

        <!-- Right Controls: Search Input & View Switcher -->
        <div class="flex items-center space-x-3 w-full md:w-auto">
          
          <!-- Search Input -->
          <div class="relative flex-1 md:w-72">
            <input type="text" 
                   [(ngModel)]="searchQuery" 
                   (input)="onFilterChange()"
                   placeholder="Search media feed..."
                   class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#131b2e]/60 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-all" />

            <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <!-- View Mode Switcher -->
          <div class="flex items-center bg-[#131b2e]/60 p-1 rounded-2xl border border-white/10 shrink-0">
            <button (click)="viewMode = 'card'"
                    [class]="viewMode === 'card' ? 'bg-indigo-600 text-white font-semibold shadow-md' : 'text-gray-400 hover:text-white'"
                    class="px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
              <span>Cards</span>
            </button>
            <button (click)="viewMode = 'table'"
                    [class]="viewMode === 'table' ? 'bg-indigo-600 text-white font-semibold shadow-md' : 'text-gray-400 hover:text-white'"
                    class="px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
              </svg>
              <span>Table</span>
            </button>
          </div>

        </div>

      </div>

      <!-- Loading State -->
      <div *ngIf="repo.loading() && yearGroups.length === 0" class="flex justify-center items-center py-20">
        <div class="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>

      <!-- Get Started Onboarding Guide (when connected with no records) -->
      <div *ngIf="!repo.loading() && yearGroups.length === 0 && auth.isAuthenticated()" class="pt-2">
        <app-get-started></app-get-started>
      </div>

      <!-- Empty State (when not connected) -->
      <div *ngIf="!repo.loading() && yearGroups.length === 0 && !auth.isAuthenticated()" class="bg-[#131b2e]/40 rounded-3xl p-12 text-center border border-dashed border-white/10 max-w-lg mx-auto my-12">
        <div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-white mb-1">Connect Your PDS</h3>
        <p class="text-gray-400 text-sm mb-4">
          Connect your AT Protocol Personal Data Server account above to start logging and tracking your media.
        </p>
      </div>

      <!-- Collapsible Year Groups Stream -->
      <div *ngIf="yearGroups.length > 0" class="space-y-8">
        
        <div *ngFor="let group of yearGroups" 
             class="bg-[#131b2e]/60 rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all backdrop-blur-xl">
          
          <!-- Collapsible Year Header Bar -->
          <button (click)="toggleYearGroup(group)"
                  class="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 border-b border-white/10 transition-colors select-none text-left">
            
            <div class="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-2">
              <span class="text-2xl font-extrabold text-white font-['Outfit'] tracking-tight">{{ group.yearLabel }}</span>
              <span class="px-3 py-0.5 rounded-full bg-white/10 text-gray-300 text-xs font-semibold">
                {{ group.logs.length }} {{ group.logs.length === 1 ? 'entry' : 'entries' }}
              </span>
              <span *ngIf="group.yearNumber === currentYear" class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                Current Year
              </span>

              <!-- Type Breakdown Badges -->
              <div class="flex items-center space-x-1.5 ml-2">
                <span *ngIf="group.typeCounts.book > 0" 
                      class="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[11px] font-medium border border-indigo-500/30">
                  {{ group.typeCounts.book }} {{ group.typeCounts.book === 1 ? 'Book' : 'Books' }}
                </span>

                <span *ngIf="group.typeCounts.movie > 0" 
                      class="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 text-[11px] font-medium border border-amber-500/30">
                  {{ group.typeCounts.movie }} {{ group.typeCounts.movie === 1 ? 'Movie' : 'Movies' }}
                </span>

                <span *ngIf="group.typeCounts.concert > 0" 
                      class="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                  {{ group.typeCounts.concert }} {{ group.typeCounts.concert === 1 ? 'Concert' : 'Concerts' }}
                </span>
              </div>
            </div>

            <div class="flex items-center space-x-2 text-gray-400 text-xs font-medium">
              <span>{{ group.isExpanded ? 'Collapse' : 'Expand' }}</span>
              <svg [class.rotate-180]="group.isExpanded" 
                   class="w-5 h-5 text-gray-400 transition-transform duration-200" 
                   fill="none" 
                   stroke="currentColor" 
                   viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </button>

          <!-- Expanded View Mode Content -->
          <div *ngIf="group.isExpanded">
            
            <!-- VIEW MODE 1: CARD GRID (Default) -->
            <div *ngIf="viewMode === 'card'" class="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <div *ngFor="let log of group.logs" 
                   class="bg-white/5 hover:bg-white/10 rounded-2xl p-3.5 border border-white/10 flex flex-col justify-between relative group transition-all">
                <div>
                  <!-- Card Header: Type Badge & Actions -->
                  <div class="flex items-center justify-between mb-2.5">
                    <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span [class]="getTypeBadgeClass(log.mediaItem?.mediaType)"
                            class="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                        {{ log.mediaItem?.mediaType }}
                      </span>

                      <!-- In Progress Tag -->
                      <span *ngIf="log.status === 'consuming'"
                            class="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold tracking-wide">
                        In Progress
                      </span>
                    </div>

                    <!-- Delete button -->
                    <button (click)="deleteLog(log)"
                            title="Delete entry from PDS"
                            class="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>

                  <!-- Clickable Link to StoryGraph / Letterboxd / setlist.fm -->
                  <a [href]="getExternalUrl(log)" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     class="block group/link cursor-pointer" 
                     [title]="'View on ' + getProviderName(log.mediaItem?.mediaType)">

                    <!-- Poster Art / Cover Image Area (Fixed Aspect Ratio with Placeholder) -->
                    <div class="mb-3 overflow-hidden rounded-xl bg-black/40 aspect-[2/3] w-full shadow-lg relative group-hover/link:ring-2 group-hover/link:ring-indigo-500/50 transition-all border border-white/5">
                      <img *ngIf="getCoverUrl(log)" 
                           [src]="getCoverUrl(log)" 
                           [alt]="log.mediaItem?.title" 
                           class="w-full h-full object-cover rounded-xl group-hover/link:scale-105 transition-transform duration-300" />
                      
                      <!-- Fallback stylized poster placeholder if image is still loading or resolving -->
                      <div *ngIf="!getCoverUrl(log)" class="w-full h-full bg-gradient-to-br from-[#1c2438] to-[#0f1523] flex flex-col items-center justify-center p-3 text-center">
                        <span class="text-3xl mb-1.5 opacity-80">{{ getTypeIcon(log.mediaItem?.mediaType) }}</span>
                        <span class="text-[10px] font-semibold text-gray-300 line-clamp-2 px-1">{{ log.mediaItem?.title }}</span>
                      </div>

                      <div class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/link:opacity-100 transition-opacity">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </div>
                    </div>

                    <!-- Title & Subtitle -->
                    <h3 class="text-sm font-bold text-white leading-snug group-hover/link:text-indigo-300 transition-colors line-clamp-2 flex items-center justify-between">
                      <span>{{ log.mediaItem?.title }}</span>
                      <svg class="w-3.5 h-3.5 text-gray-500 group-hover/link:text-indigo-400 shrink-0 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </h3>
                  </a>

                  <p *ngIf="getSubtitle(log)" class="text-[11px] text-gray-400 mt-1 font-medium truncate">
                    {{ getSubtitle(log) }}
                  </p>

                  <!-- Rating -->
                  <div *ngIf="log.rating" class="flex items-center space-x-0.5 mt-1.5">
                    <span *ngFor="let star of [1,2,3,4,5]" 
                          [class]="star <= log.rating ? 'text-amber-400' : 'text-gray-700'" 
                          class="text-xs">
                      ★
                    </span>
                  </div>

                  <!-- Review Snippet -->
                  <p *ngIf="log.review" class="text-[11px] text-gray-300 bg-white/5 p-2 rounded-lg italic mt-2 border border-white/5 line-clamp-2">
                    "{{ log.review }}"
                  </p>
                </div>

                <!-- Card Footer: Completed / Log Date -->
                <div class="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                  <span *ngIf="log.completedAt">{{ log.completedAt | date:'mediumDate' }}</span>
                  <span *ngIf="!log.completedAt">{{ log.loggedAt | date:'mediumDate' }}</span>
                </div>
              </div>
            </div>

            <!-- VIEW MODE 2: TABLE VIEW -->
            <div *ngIf="viewMode === 'table'" class="overflow-x-auto">
              <table class="w-full text-left text-xs text-gray-300 border-collapse">
                <thead class="bg-white/5 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/10 text-[10px]">
                  <tr>
                    <th scope="col" class="py-3.5 px-4 w-12">Cover</th>
                    <th scope="col" class="py-3.5 px-4">Type</th>
                    <th scope="col" class="py-3.5 px-4">Title</th>
                    <th scope="col" class="py-3.5 px-4">Author / Creator / Venue</th>
                    <th scope="col" class="py-3.5 px-4">Rating</th>
                    <th scope="col" class="py-3.5 px-4">Completed / Logged</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  <tr *ngFor="let log of group.logs" class="hover:bg-white/5 transition-colors">
                    
                    <!-- Cover Thumbnail -->
                    <td class="py-2.5 px-4">
                      <img *ngIf="getCoverUrl(log)" 
                           [src]="getCoverUrl(log)" 
                           [alt]="log.mediaItem?.title" 
                           class="w-8 h-12 object-cover rounded-md bg-black/40 border border-white/10" />
                      <div *ngIf="!getCoverUrl(log)" class="w-8 h-12 bg-white/5 rounded-md border border-white/10 flex items-center justify-center text-[10px] text-gray-500">
                        {{ getTypeIcon(log.mediaItem?.mediaType) }}
                      </div>
                    </td>

                    <!-- Type Badge -->
                    <td class="py-2.5 px-4 whitespace-nowrap">
                      <span [class]="getTypeBadgeClass(log.mediaItem?.mediaType)"
                            class="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                        {{ log.mediaItem?.mediaType }}
                      </span>
                    </td>

                    <!-- Title (External Link) -->
                    <td class="py-2.5 px-4 font-bold text-white max-w-xs truncate">
                      <a [href]="getExternalUrl(log)" 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         class="hover:text-indigo-400 transition-colors inline-flex items-center space-x-1" 
                         [title]="'View on ' + getProviderName(log.mediaItem?.mediaType)">
                        <span>{{ log.mediaItem?.title }}</span>
                        <svg class="w-3 h-3 text-gray-500 hover:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </a>
                    </td>

                    <!-- Creator Details -->
                    <td class="py-2.5 px-4 text-gray-400">
                      {{ getSubtitle(log) || '-' }}
                    </td>

                    <!-- Rating -->
                    <td class="py-2.5 px-4 whitespace-nowrap">
                      <div *ngIf="log.rating" class="flex items-center space-x-0.5">
                        <span *ngFor="let star of [1,2,3,4,5]" 
                              [class]="star <= log.rating ? 'text-amber-400' : 'text-gray-700'" 
                              class="text-xs">
                          ★
                        </span>
                      </div>
                      <span *ngIf="!log.rating" class="text-gray-600">-</span>
                    </td>

                    <!-- Date -->
                    <td class="py-2.5 px-4 text-gray-400 whitespace-nowrap">
                      <span *ngIf="log.completedAt">{{ log.completedAt | date:'mediumDate' }}</span>
                      <span *ngIf="!log.completedAt">{{ log.loggedAt | date:'mediumDate' }}</span>
                    </td>

                  </tr>

                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);
  modal = inject(ModalService);

  yearGroups: YearGroup[] = [];
  searchQuery = '';
  currentYear = new Date().getFullYear();
  viewMode: 'card' | 'table' = 'card';

  selectedTypes = {
    book: true,
    movie: true,
    concert: true
  };

  constructor() {
    effect(() => {
      const allLogs = this.repo.logs();
      this.processYearGroups(allLogs);
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
    this.processYearGroups(this.repo.logs());
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
        return title.includes(q) || review.includes(q);
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
        isExpanded: year === this.currentYear,
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
        isExpanded: false,
        typeCounts: {
          book: olderLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'book').length,
          movie: olderLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'movie').length,
          concert: olderLogs.filter(l => (l.mediaItem?.mediaType || 'book') === 'concert').length
        }
      });
    }

    this.yearGroups = groups;
  }

  toggleYearGroup(group: YearGroup) {
    group.isExpanded = !group.isExpanded;
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

  countByType(type: string): number {
    return this.repo.getStats('want_to_consume')[type] || 0;
  }

  getTypeBadgeClass(type?: string): string {
    switch (type) {
      case 'book': return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      case 'movie': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'concert': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  }

  getTypeIcon(type?: string): string {
    switch (type) {
      case 'book': return '📚';
      case 'movie': return '🎬';
      case 'concert': return '🎟️';
      default: return '🌟';
    }
  }

  getCoverUrl(log: PdsUserLog): string | null {
    const meta = log.mediaItem?.metadataJson || {};
    const direct = meta['coverUrl'] || meta['cover_url'] || meta['poster_url'] || meta['posterUrl'] || meta['image_url'];
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
    const meta = log.mediaItem?.metadataJson;
    if (!meta) return null;

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
    const meta = log.mediaItem?.metadataJson || {};
    const type = log.mediaItem?.mediaType;
    const title = log.mediaItem?.title || '';

    if (type === 'concert') {
      if (meta['setlist_url']) return meta['setlist_url'];
      return `https://www.setlist.fm/search?query=${encodeURIComponent(title)}`;
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
      case 'concert': return 'setlist.fm';
      default: return 'External Provider';
    }
  }
}
