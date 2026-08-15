import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdsRepositoryService, PdsUserLog } from '../../services/pds-repo.service';
import { PdsAuthService } from '../../services/pds-auth.service';

@Component({
  selector: 'app-want-to-consume',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      
      <!-- Header Banner -->
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
                   placeholder="Search planned items..."
                   class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#131b2e]/60 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-all" />

            <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <!-- Refresh PDS Button -->
          <button (click)="syncPds()" 
                  title="Sync from PDS"
                  class="p-2.5 rounded-2xl bg-[#131b2e]/60 border border-white/10 text-gray-400 hover:text-white transition-all">
            <svg class="w-4 h-4" [ngClass]="{'animate-spin': repo.loading()}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>

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

      <!-- Loading Spinner -->
      <div *ngIf="repo.loading() && filteredLogs.length === 0" class="flex justify-center items-center py-20">
        <div class="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!repo.loading() && filteredLogs.length === 0" class="bg-[#131b2e]/40 rounded-3xl p-12 text-center border border-dashed border-white/10 max-w-lg mx-auto my-12">
        <div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-white mb-1">No Planned Media Items</h3>
        <p class="text-gray-400 text-sm">Add books, movies, or concerts to your watchlist with status "Want to Consume"!</p>
      </div>

      <!-- VIEW MODE 1: CARD GRID (Default) -->
      <div *ngIf="viewMode === 'card' && filteredLogs.length > 0" 
           class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        
        <div *ngFor="let item of filteredLogs" 
             class="bg-[#131b2e]/60 hover:bg-[#131b2e]/90 rounded-2xl p-3.5 border border-white/10 flex flex-col justify-between relative group backdrop-blur-xl transition-all shadow-lg">
          
          <div>
            <!-- Card Header: Type Badge & Delete Button -->
            <div class="flex items-center justify-between mb-2.5">
              <span [class]="getTypeBadgeClass(item.mediaItem?.mediaType)"
                    class="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                {{ item.mediaItem?.mediaType }}
              </span>

              <button (click)="deleteItem(item)"
                      title="Delete item from PDS"
                      class="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>

            <!-- External Link & Poster Image Area (Fixed Aspect Ratio with Placeholder) -->
            <a [href]="getExternalUrl(item)" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="block group/link cursor-pointer" 
               [title]="'View on ' + getProviderName(item.mediaItem?.mediaType)">

              <div class="mb-3 overflow-hidden rounded-xl bg-black/40 aspect-[2/3] w-full shadow-lg relative group-hover/link:ring-2 group-hover/link:ring-indigo-500/50 transition-all border border-white/5">
                <img *ngIf="getCoverUrl(item)" 
                     [src]="getCoverUrl(item)" 
                     [alt]="item.mediaItem?.title" 
                     class="w-full h-full object-cover rounded-xl group-hover/link:scale-105 transition-transform duration-300" />
                
                <div *ngIf="!getCoverUrl(item)" class="w-full h-full bg-gradient-to-br from-[#1c2438] to-[#0f1523] flex flex-col items-center justify-center p-3 text-center">
                  <span class="text-3xl mb-1.5 opacity-80">{{ getTypeIcon(item.mediaItem?.mediaType) }}</span>
                  <span class="text-[10px] font-semibold text-gray-300 line-clamp-2 px-1">{{ item.mediaItem?.title }}</span>
                </div>

                <div class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/link:opacity-100 transition-opacity">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </div>
              </div>

              <!-- Title -->
              <h3 class="text-sm font-bold text-white leading-snug group-hover/link:text-indigo-300 transition-colors line-clamp-2 flex items-center justify-between">
                <span>{{ item.mediaItem?.title }}</span>
                <svg class="w-3.5 h-3.5 text-gray-500 group-hover/link:text-indigo-400 shrink-0 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </h3>
            </a>

            <p *ngIf="getCreatorDetails(item) !== '-'" class="text-[11px] text-gray-400 mt-1 font-medium truncate">
              {{ getCreatorDetails(item) }}
            </p>
          </div>

          <!-- Card Footer: Logged Date & Mark Completed Button -->
          <div class="pt-3 mt-3 border-t border-white/5 flex items-center justify-between">
            <span class="text-[10px] text-gray-500">{{ item.loggedAt | date:'mediumDate' }}</span>
            <button (click)="markCompleted(item)"
                    class="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all">
              ✓ Complete
            </button>
          </div>

        </div>

      </div>

      <!-- VIEW MODE 2: TABLE VIEW -->
      <div *ngIf="viewMode === 'table' && filteredLogs.length > 0" 
           class="bg-[#131b2e]/60 rounded-2xl border border-white/10 overflow-hidden shadow-xl backdrop-blur-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-gray-300">
            <thead class="bg-white/5 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/10 text-[10px]">
              <tr>
                <th scope="col" class="py-3.5 px-4 w-12">Cover</th>
                <th scope="col" class="py-3.5 px-4">Type</th>
                <th scope="col" class="py-3.5 px-4">Title</th>
                <th scope="col" class="py-3.5 px-4">Author / Creator / Venue</th>
                <th scope="col" class="py-3.5 px-4">Date Added</th>
                <th scope="col" class="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr *ngFor="let item of filteredLogs" class="hover:bg-white/5 transition-colors">
                
                <!-- Cover Thumbnail -->
                <td class="py-2.5 px-4">
                  <img *ngIf="getCoverUrl(item)" 
                       [src]="getCoverUrl(item)" 
                       [alt]="item.mediaItem?.title" 
                       class="w-8 h-12 object-cover rounded-md bg-black/40 border border-white/10" />
                  <div *ngIf="!getCoverUrl(item)" class="w-8 h-12 bg-white/5 rounded-md border border-white/10 flex items-center justify-center text-[10px] text-gray-500">
                    {{ getTypeIcon(item.mediaItem?.mediaType) }}
                  </div>
                </td>

                <!-- Type -->
                <td class="py-2.5 px-4 whitespace-nowrap">
                  <span [class]="getTypeBadgeClass(item.mediaItem?.mediaType)"
                        class="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                    {{ item.mediaItem?.mediaType }}
                  </span>
                </td>

                <!-- Title -->
                <td class="py-2.5 px-4 font-bold text-white max-w-xs truncate">
                  <a [href]="getExternalUrl(item)" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     class="hover:text-indigo-400 transition-colors inline-flex items-center space-x-1" 
                     [title]="'View on ' + getProviderName(item.mediaItem?.mediaType)">
                    <span>{{ item.mediaItem?.title }}</span>
                    <svg class="w-3 h-3 text-gray-500 hover:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                </td>

                <!-- Creator / Author / Venue -->
                <td class="py-2.5 px-4 text-gray-400">
                  {{ getCreatorDetails(item) }}
                </td>

                <!-- Date Added -->
                <td class="py-2.5 px-4 text-gray-400 whitespace-nowrap">
                  {{ item.loggedAt | date:'mediumDate' }}
                </td>

                <!-- Action -->
                <td class="py-2.5 px-4 text-right">
                  <button (click)="markCompleted(item)"
                          class="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all">
                    ✓ Complete
                  </button>
                </td>

              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class WantToConsumeComponent implements OnInit {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);

  filteredLogs: PdsUserLog[] = [];
  searchQuery = '';
  viewMode: 'card' | 'table' = 'card';

  selectedTypes = {
    book: true,
    movie: true,
    concert: true
  };

  constructor() {
    effect(() => {
      this.applyFilters();
    });
  }

  ngOnInit() {
    window.addEventListener('trackstar:media-saved', () => this.syncPds());
  }

  syncPds() {
    this.repo.syncFromPds();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    const q = this.searchQuery.toLowerCase().trim();
    const wantLogs = this.repo.logs().filter(l => l.status === 'want_to_consume');

    this.filteredLogs = wantLogs.filter(log => {
      const type = log.mediaItem?.mediaType || 'book';
      if (type in this.selectedTypes && !this.selectedTypes[type as keyof typeof this.selectedTypes]) {
        return false;
      }
      if (q) {
        const title = (log.mediaItem?.title || '').toLowerCase();
        const creator = this.getCreatorDetails(log).toLowerCase();
        return title.includes(q) || creator.includes(q);
      }
      return true;
    });
  }

  countByType(type: string): number {
    return this.repo.getStats(undefined, 'want_to_consume')[type] || 0;
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

  getCoverUrl(item: PdsUserLog): string | null {
    const meta = item.mediaItem?.metadataJson || {};
    const direct = meta['coverUrl'] || meta['cover_url'] || meta['poster_url'] || meta['posterUrl'] || meta['image_url'];
    if (direct) return direct;

    const id = item.mediaItemId || item.mediaItem?.id || '';
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

  async markCompleted(item: PdsUserLog) {
    try {
      await this.repo.createLog({
        mediaType: item.mediaItem?.mediaType || 'book',
        title: item.mediaItem?.title || '',
        status: 'completed',
        completedAt: new Date().toISOString(),
        mediaItemId: item.mediaItemId,
        metadataJson: item.mediaItem?.metadataJson
      });
    } catch (err) {
      console.error('Failed to update status to completed on PDS:', err);
    }
  }

  async deleteItem(item: PdsUserLog) {
    if (confirm(`Remove "${item.mediaItem?.title}" from watchlist on your PDS?`)) {
      try {
        await this.repo.deleteLog(item);
      } catch (err) {
        console.error('Failed to delete item from PDS:', err);
      }
    }
  }

  getCreatorDetails(item: PdsUserLog): string {
    const meta = item.mediaItem?.metadataJson || {};
    if (meta['creator']) return meta['creator'];
    if (meta['author']) return meta['author'];
    if (meta['artist']) return meta['artist'];
    if (meta['venue']) return meta['venue'];
    if (meta['year']) return `Released ${meta['year']}`;
    return '-';
  }

  getExternalUrl(item: PdsUserLog): string {
    const meta = item.mediaItem?.metadataJson || {};
    const type = item.mediaItem?.mediaType;
    const title = item.mediaItem?.title || '';

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
