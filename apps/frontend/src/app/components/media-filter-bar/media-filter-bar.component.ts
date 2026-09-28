import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TypeSelection {
  book: boolean;
  movie: boolean;
  concert: boolean;
  [key: string]: boolean;
}

export interface TypeCounts {
  book: number;
  movie: number;
  concert: number;
  [key: string]: number;
}

@Component({
  selector: 'app-media-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="border border-[rgba(14,14,14,0.24)] bg-[#faf7f2] rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between text-xs overflow-hidden shadow-sm">
      
      <!-- Left: Filter Pills / Chips -->
      <div class="flex items-center space-x-1.5 px-3 py-2 overflow-x-auto" role="toolbar" aria-label="Media feed filters">
        <span class="font-mono text-[10px] uppercase font-bold text-[#9a8f7e] tracking-wider shrink-0 mr-1 hidden sm:inline select-none">FILTER:</span>
        
        <!-- All Chip -->
        <button type="button"
                (click)="selectAll()"
                [attr.aria-pressed]="isAllSelected"
                [title]="'Show all media types (' + totalCount + ' total)'"
                class="px-2.5 py-1 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-all select-none border cursor-pointer shrink-0"
                [class]="isAllSelected 
                  ? 'bg-[#0e0e0e] text-[#f0ede6] border-[#0e0e0e] font-bold shadow-xs' 
                  : 'bg-[rgba(14,14,14,0.03)] hover:bg-[rgba(14,14,14,0.07)] text-[#3d3830] hover:text-[#0e0e0e] border-[rgba(14,14,14,0.14)] hover:border-[rgba(14,14,14,0.28)]'">
          <span>All</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors"
                [class]="isAllSelected ? 'bg-white/20 text-[#f0ede6]' : 'bg-[rgba(14,14,14,0.06)] text-[#3d3830]'">
            {{ totalCount }}
          </span>
        </button>

        <!-- Books Chip -->
        <button type="button"
                (click)="selectType('book', $event)"
                [attr.aria-pressed]="isTypeActive('book')"
                [title]="getFilterTooltip('book', 'Books')"
                class="group px-2.5 py-1 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-all select-none border cursor-pointer shrink-0"
                [class]="isTypeActive('book') 
                  ? 'bg-[#0e0e0e] text-[#f0ede6] border-[#0e0e0e] font-bold shadow-xs' 
                  : 'bg-[rgba(14,14,14,0.03)] hover:bg-[rgba(14,14,14,0.07)] text-[#3d3830] hover:text-[#0e0e0e] border-[rgba(14,14,14,0.14)] hover:border-[rgba(14,14,14,0.28)]'">
          <svg class="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          <span>Books</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors"
                [class]="isTypeActive('book') ? 'bg-white/20 text-[#f0ede6]' : 'bg-[rgba(14,14,14,0.06)] text-[#3d3830]'">
            {{ counts.book || 0 }}
          </span>
        </button>

        <!-- Movies Chip -->
        <button type="button"
                (click)="selectType('movie', $event)"
                [attr.aria-pressed]="isTypeActive('movie')"
                [title]="getFilterTooltip('movie', 'Movies')"
                class="group px-2.5 py-1 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-all select-none border cursor-pointer shrink-0"
                [class]="isTypeActive('movie') 
                  ? 'bg-[#0e0e0e] text-[#f0ede6] border-[#0e0e0e] font-bold shadow-xs' 
                  : 'bg-[rgba(14,14,14,0.03)] hover:bg-[rgba(14,14,14,0.07)] text-[#3d3830] hover:text-[#0e0e0e] border-[rgba(14,14,14,0.14)] hover:border-[rgba(14,14,14,0.28)]'">
          <svg class="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
          </svg>
          <span>Movies</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors"
                [class]="isTypeActive('movie') ? 'bg-white/20 text-[#f0ede6]' : 'bg-[rgba(14,14,14,0.06)] text-[#3d3830]'">
            {{ counts.movie || 0 }}
          </span>
        </button>

        <!-- Concerts Chip -->
        <button type="button"
                (click)="selectType('concert', $event)"
                [attr.aria-pressed]="isTypeActive('concert')"
                [title]="getFilterTooltip('concert', 'Concerts')"
                class="group px-2.5 py-1 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-all select-none border cursor-pointer shrink-0"
                [class]="isTypeActive('concert') 
                  ? 'bg-[#0e0e0e] text-[#f0ede6] border-[#0e0e0e] font-bold shadow-xs' 
                  : 'bg-[rgba(14,14,14,0.03)] hover:bg-[rgba(14,14,14,0.07)] text-[#3d3830] hover:text-[#0e0e0e] border-[rgba(14,14,14,0.14)] hover:border-[rgba(14,14,14,0.28)]'">
          <svg class="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
          <span>Concerts</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors"
                [class]="isTypeActive('concert') ? 'bg-white/20 text-[#f0ede6]' : 'bg-[rgba(14,14,14,0.06)] text-[#3d3830]'">
            {{ counts.concert || 0 }}
          </span>
        </button>
      </div>

      <!-- Middle: Search Input -->
      <div class="border-t md:border-t-0 md:border-l border-[rgba(14,14,14,0.14)] flex items-center px-3.5 py-2 flex-1 relative">
        <svg class="w-3.5 h-3.5 text-[#9a8f7e] shrink-0 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input type="text" 
               [(ngModel)]="searchQuery" 
               (input)="onSearchInputChange()"
               [placeholder]="searchPlaceholder"
               class="w-full bg-transparent placeholder-[#9a8f7e] text-[#0e0e0e] font-mono text-xs focus:outline-none" />
        <button *ngIf="searchQuery"
                type="button"
                (click)="clearSearch()"
                aria-label="Clear search"
                title="Clear search"
                class="text-[#9a8f7e] hover:text-[#0e0e0e] transition-colors p-0.5 ml-1 cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Right: View Mode Toggle (Cards vs Table) -->
      <div class="border-t md:border-t-0 md:border-l border-[rgba(14,14,14,0.14)] px-3 py-1.5 flex items-center space-x-1 shrink-0">
        <button (click)="setViewMode('card')"
                type="button"
                [class]="viewMode === 'card' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold' : 'text-[#3d3830] hover:text-[#0e0e0e] bg-transparent'"
                class="px-2.5 py-1 rounded-md text-xs font-mono flex items-center space-x-1.5 transition-all cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
          <span>Cards</span>
        </button>
        <button (click)="setViewMode('table')"
                type="button"
                [class]="viewMode === 'table' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold' : 'text-[#3d3830] hover:text-[#0e0e0e] bg-transparent'"
                class="px-2.5 py-1 rounded-md text-xs font-mono flex items-center space-x-1.5 transition-all cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
          </svg>
          <span>Table</span>
        </button>
      </div>

    </div>
  `
})
export class MediaFilterBarComponent {
  @Input() counts: TypeCounts = { book: 0, movie: 0, concert: 0 };
  @Input() selectedTypes: TypeSelection = { book: true, movie: true, concert: true };
  @Input() searchQuery = '';
  @Input() viewMode: 'card' | 'table' = 'card';
  @Input() searchPlaceholder = 'Search media...';

  @Output() selectedTypesChange = new EventEmitter<TypeSelection>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() viewModeChange = new EventEmitter<'card' | 'table'>();
  @Output() filterChange = new EventEmitter<void>();

  private isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

  get modKeyName(): string {
    return this.isMac ? '⌘' : 'Ctrl';
  }

  get totalCount(): number {
    if (!this.counts) return 0;
    return (this.counts.book || 0) + (this.counts.movie || 0) + (this.counts.concert || 0);
  }

  get isAllSelected(): boolean {
    if (!this.selectedTypes) return true;
    const types = ['book', 'movie', 'concert'];
    const activeCount = types.filter(t => !!this.selectedTypes[t]).length;
    return activeCount === 0 || activeCount === types.length;
  }

  isTypeActive(type: string): boolean {
    if (this.isAllSelected) return false;
    return !!this.selectedTypes[type];
  }

  isOnlyTypeActive(type: string): boolean {
    if (this.isAllSelected) return false;
    const types = ['book', 'movie', 'concert'];
    return !!this.selectedTypes[type] && types.filter(t => t !== type).every(t => !this.selectedTypes[t]);
  }

  selectAll(): void {
    this.selectedTypes = {
      book: true,
      movie: true,
      concert: true
    };
    this.emitChange();
  }

  selectType(type: string, event?: MouseEvent): void {
    const isMulti = !!(event && (event.metaKey || event.ctrlKey || event.shiftKey));

    if (isMulti) {
      if (this.isAllSelected) {
        // From All state, modifier-clicking toggles this one off (keeping the others)
        this.selectedTypes = {
          book: true,
          movie: true,
          concert: true,
          [type]: false
        };
      } else {
        const nextState = !this.selectedTypes[type];
        this.selectedTypes = {
          ...this.selectedTypes,
          [type]: nextState
        };
      }

      const types = ['book', 'movie', 'concert'];
      const activeCount = types.filter(t => !!this.selectedTypes[t]).length;
      if (activeCount === 0 || activeCount === types.length) {
        this.selectAll();
        return;
      }

      this.emitChange();
      return;
    }

    // Single click without modifier
    // 1. If this is already the ONLY active type, clicking it resets back to All
    if (!this.isAllSelected && this.isOnlyTypeActive(type)) {
      this.selectAll();
      return;
    }

    // 2. Otherwise, filter directly to JUST this type in a single click!
    this.selectedTypes = {
      book: false,
      movie: false,
      concert: false,
      [type]: true
    };
    this.emitChange();
  }

  getFilterTooltip(type: string, label: string): string {
    if (this.isTypeActive(type)) {
      return `Filtered to ${label}. Click to show all, or ${this.modKeyName}+click to toggle.`;
    }
    return `Click to filter to only ${label} (${this.modKeyName}+click to select multiple).`;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchQueryChange.emit('');
    this.filterChange.emit();
  }

  onSearchInputChange(): void {
    this.searchQueryChange.emit(this.searchQuery);
    this.filterChange.emit();
  }

  setViewMode(mode: 'card' | 'table'): void {
    this.viewMode = mode;
    this.viewModeChange.emit(mode);
  }

  private emitChange(): void {
    this.selectedTypesChange.emit(this.selectedTypes);
    this.filterChange.emit();
  }
}
