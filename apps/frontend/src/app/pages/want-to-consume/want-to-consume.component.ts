import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { PdsAuthService } from '../../services/pds-auth.service';
import { PdsRepositoryService, PdsUserLog } from '../../services/pds-repo.service';
import { MediaFilterBarComponent, TypeCounts, TypeSelection } from '../../components/media-filter-bar/media-filter-bar.component';
import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { MediaTableComponent } from '../../components/media-table/media-table.component';

@Component({
  selector: 'app-want-to-consume',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaFilterBarComponent, MediaCardComponent, MediaTableComponent],
  template: `
    <div class="flex flex-col gap-4 sm:gap-5">
      
      <!-- Unauthenticated Banner -->
      <div *ngIf="!auth.isAuthenticated()" class="bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div class="space-y-1 text-center sm:text-left">
          <h3 class="text-base font-serif font-bold text-[#0e0e0e]">Connect Your AT Protocol PDS</h3>
          <p class="text-xs text-[#3d3830] font-mono">
            Sign in with your Personal Data Server to view and manage your planned media watchlist.
          </p>
        </div>
        <button (click)="openPdsConnect()" class="px-4 py-2 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-xl text-xs font-mono font-medium shadow-sm transition-all whitespace-nowrap">
          Connect PDS Account
        </button>
      </div>

      <!-- Page Header -->
      <div class="hidden nav:flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[rgba(14,14,14,0.14)] pb-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold text-[#0e0e0e] tracking-tight">Want to Consume</h1>
          <p class="text-xs font-mono text-[#9a8f7e] mt-0.5">
            Your planned watchlist and reading backlog stored in your AT Protocol repository.
          </p>
        </div>
        <div class="font-mono text-xs text-[#9a8f7e] shrink-0">
          {{ filteredWantToConsume.length }} {{ filteredWantToConsume.length === 1 ? 'item' : 'items' }} planned
        </div>
      </div>

      <!-- Shared Filter & Search Bar -->
      <app-media-filter-bar 
        [counts]="currentTypeCounts"
        [(selectedTypes)]="selectedTypes"
        [(searchQuery)]="searchQuery"
        [(viewMode)]="viewMode"
        searchPlaceholder="Search want to consume..."
        (filterChange)="onFilterChange()" />

      <!-- Loading State -->
      <div *ngIf="repo.loading() && repo.logs().length === 0" class="flex justify-center items-center py-20">
        <div class="w-8 h-8 border-2 border-[rgba(14,14,14,0.14)] border-t-[#0e0e0e] rounded-full animate-spin"></div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!repo.loading() && filteredWantToConsume.length === 0" class="bg-[#faf7f2] rounded-2xl p-12 text-center border border-[rgba(14,14,14,0.24)] max-w-lg mx-auto my-8 shadow-sm">
        <div class="w-12 h-12 bg-[#0e0e0e]/5 rounded-full flex items-center justify-center mx-auto mb-3 text-[#0e0e0e] font-bold text-lg">
          ★
        </div>
        <h3 class="text-base font-serif font-bold text-[#0e0e0e] mb-1">No Planned Media Items</h3>
        <p class="text-[#9a8f7e] font-mono text-xs mb-4">
          Add books, movies, or concerts with status "Want to Consume" to build your backlog.
        </p>
        <button (click)="openLogModal()" class="px-4 py-2 bg-[#0e0e0e] text-[#f0ede6] rounded-xl text-xs font-mono font-semibold shadow-sm hover:bg-neutral-800 transition-all">
          + Log Planned Media
        </button>
      </div>

      <!-- View Mode 1: 5-per-row Card Grid -->
      <div *ngIf="viewMode === 'card' && filteredWantToConsume.length > 0" 
           class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
        <app-media-card 
          *ngFor="let item of filteredWantToConsume" 
          [log]="item"
          [showCompleteAction]="true"
          [showRating]="false"
          [showReview]="false"
          [datePrefix]="'Added'"
          (complete)="markCompleted($event)"
          (delete)="deleteLog($event)" />
      </div>

      <!-- View Mode 2: Table View -->
      <app-media-table 
        *ngIf="viewMode === 'table' && filteredWantToConsume.length > 0"
        [logs]="filteredWantToConsume"
        [showCompleteAction]="true"
        [showRating]="false"
        dateHeader="Date Added"
        (complete)="markCompleted($event)"
        (delete)="deleteLog($event)" />

    </div>
  `
})
export class WantToConsumeComponent implements OnInit {
  repo = inject(PdsRepositoryService);
  auth = inject(PdsAuthService);
  modal = inject(ModalService);

  viewMode: 'card' | 'table' = 'card';
  searchQuery = '';
  filteredWantToConsume: PdsUserLog[] = [];

  selectedTypes: TypeSelection = {
    book: true,
    movie: true,
    concert: true
  };

  get currentTypeCounts(): TypeCounts {
    return {
      book: this.countByType('book'),
      movie: this.countByType('movie'),
      concert: this.countByType('concert')
    };
  }

  constructor() {
    effect(() => {
      const allLogs = this.repo.logs();
      this.processData(allLogs);
    });
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.repo.syncFromPds();
    }
  }

  processData(items: PdsUserLog[]) {
    const wantLogs = items.filter(l => l.status === 'want_to_consume');

    this.filteredWantToConsume = wantLogs.filter(log => {
      const type = log.mediaItem?.mediaType || 'book';
      if (type in this.selectedTypes && !this.selectedTypes[type as keyof typeof this.selectedTypes]) {
        return false;
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        const title = (log.mediaItem?.title || '').toLowerCase();
        return title.includes(q);
      }
      return true;
    });

    this.repo.enrichItems(this.filteredWantToConsume);
  }

  countByType(type: string): number {
    return this.repo.getStats(undefined, 'want_to_consume')[type] || 0;
  }

  onFilterChange(): void {
    this.processData(this.repo.logs());
  }

  openPdsConnect(): void {
    this.modal.openPdsModal();
  }

  openLogModal(): void {
    this.modal.openLogModal();
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

  async deleteLog(log: PdsUserLog) {
    if (confirm(`Are you sure you want to delete "${log.mediaItem?.title}" from your PDS?`)) {
      try {
        await this.repo.deleteLog(log);
      } catch (err) {
        console.error('Failed to delete log from PDS:', err);
      }
    }
  }
}
