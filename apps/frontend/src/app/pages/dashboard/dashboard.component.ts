import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PdsUserLog, YearGroup } from '@trackstar/data';
import { ModalService } from '../../services/modal.service';
import { PdsAuthService } from '../../services/pds-auth.service';
import { PdsRepositoryService } from '../../services/pds-repo.service';
import { MediaFilterBarComponent, TypeCounts, TypeSelection } from '../../components/media-filter-bar/media-filter-bar.component';
import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { MediaTableComponent } from '../../components/media-table/media-table.component';

export type { YearGroup };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaFilterBarComponent, MediaCardComponent, MediaTableComponent],
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

      <!-- Page Header -->
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

      <!-- Shared Filter & Search Bar -->
      <app-media-filter-bar 
        [counts]="currentTypeCounts"
        [(selectedTypes)]="selectedTypes"
        [(searchQuery)]="searchQuery"
        [(viewMode)]="viewMode"
        searchPlaceholder="Search media feed..."
        (filterChange)="onFilterChange()" />

      <!-- Loading State -->
      <div *ngIf="repo.loading() && repo.logs().length === 0" class="flex justify-center items-center py-20">
        <div class="w-8 h-8 border-2 border-[rgba(14,14,14,0.14)] border-t-[#0e0e0e] rounded-full animate-spin"></div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!repo.loading() && yearGroups.length === 0" class="bg-[#faf7f2] rounded-2xl p-12 text-center border border-[rgba(14,14,14,0.24)] max-w-lg mx-auto my-8 shadow-sm">
        <div class="w-12 h-12 bg-[#0e0e0e]/5 rounded-full flex items-center justify-center mx-auto mb-3 text-[#0e0e0e] font-bold text-lg">
          ★
        </div>
        <h3 class="text-base font-serif font-bold text-[#0e0e0e] mb-1">No Media Entries Yet</h3>
        <p class="text-[#9a8f7e] font-mono text-xs mb-4">
          Add books, movies, or concerts to your feed to build your personal media log.
        </p>
        <button (click)="openLogModal()" class="px-4 py-2 bg-[#0e0e0e] text-[#f0ede6] rounded-xl text-xs font-mono font-semibold shadow-sm hover:bg-neutral-800 transition-all">
          + Log Media Entry
        </button>
      </div>

      <!-- Media Feed Stream with Year Sidebar -->
      <div *ngIf="yearGroups.length > 0" class="flex flex-col md:flex-row items-start gap-6 md:gap-8 pt-0">
        
        <!-- Year Sidebar Navigation -->
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

        <!-- Active Year Content Pane -->
        <section class="flex-1 w-full min-w-0 space-y-6" *ngIf="activeYearGroup as activeGroup">
          
          <!-- Year Header Banner -->
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

          <!-- View Mode 1: Cards -->
          <div *ngIf="viewMode === 'card'" 
               class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <app-media-card 
              *ngFor="let log of activeGroup.logs" 
              [log]="log"
              (delete)="deleteLog($event)" />
          </div>

          <!-- View Mode 2: Table -->
          <app-media-table 
            *ngIf="viewMode === 'table'"
            [logs]="activeGroup.logs"
            (delete)="deleteLog($event)" />

        </section>

      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);
  modal = inject(ModalService);

  yearGroups: YearGroup[] = [];
  selectedYearKey: string | number | null = null;
  searchQuery = '';
  currentYear = new Date().getFullYear();
  viewMode: 'card' | 'table' = 'card';

  selectedTypes: TypeSelection = {
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

  get currentTypeCounts(): TypeCounts {
    return {
      book: this.countCurrentByType('book'),
      movie: this.countCurrentByType('movie'),
      concert: this.countCurrentByType('concert')
    };
  }

  constructor() {
    effect(() => {
      const allLogs = this.repo.logs();
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

  openLogModal() {
    this.modal.openLogModal();
  }

  countConsumedTotal(): number {
    return this.repo.logs().filter(l => l.status !== 'want_to_consume').length;
  }

  countCurrentByType(type: string): number {
    return this.repo.logs().filter(l => l.status !== 'want_to_consume' && (l.mediaItem?.mediaType || 'book') === type).length;
  }
}
