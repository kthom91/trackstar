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
      
      <!-- Left: Filter Checkboxes -->
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
          <input type="checkbox" [(ngModel)]="selectedTypes.book" (change)="onCheckboxChange()" class="sr-only" />
          <span class="text-[#3d3830]">Books</span>
          <span class="px-1.5 py-0.5 rounded bg-[rgba(14,14,14,0.08)] text-[#3d3830] text-[10px] font-bold font-mono">
            {{ counts.book || 0 }}
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
          <input type="checkbox" [(ngModel)]="selectedTypes.movie" (change)="onCheckboxChange()" class="sr-only" />
          <span class="text-[#3d3830]">Movies</span>
          <span class="px-1.5 py-0.5 rounded bg-[rgba(14,14,14,0.08)] text-[#3d3830] text-[10px] font-bold font-mono">
            {{ counts.movie || 0 }}
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
          <input type="checkbox" [(ngModel)]="selectedTypes.concert" (change)="onCheckboxChange()" class="sr-only" />
          <span class="text-[#3d3830]">Concerts</span>
          <span class="px-1.5 py-0.5 rounded bg-[rgba(14,14,14,0.08)] text-[#3d3830] text-[10px] font-bold font-mono">
            {{ counts.concert || 0 }}
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
               (input)="onSearchInputChange()"
               [placeholder]="searchPlaceholder"
               class="w-full bg-transparent placeholder-[#9a8f7e] text-[#0e0e0e] font-mono text-xs focus:outline-none" />
      </div>

      <!-- Right: View Mode Toggle (Cards vs Table) -->
      <div class="border-t md:border-t-0 md:border-l border-[rgba(14,14,14,0.14)] px-3 py-1.5 flex items-center space-x-1 shrink-0">
        <button (click)="setViewMode('card')"
                [class]="viewMode === 'card' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold' : 'text-[#3d3830] hover:text-[#0e0e0e] bg-transparent'"
                class="px-2.5 py-1 rounded-md text-xs font-mono flex items-center space-x-1.5 transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
          <span>Cards</span>
        </button>
        <button (click)="setViewMode('table')"
                [class]="viewMode === 'table' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold' : 'text-[#3d3830] hover:text-[#0e0e0e] bg-transparent'"
                class="px-2.5 py-1 rounded-md text-xs font-mono flex items-center space-x-1.5 transition-all">
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

  onCheckboxChange() {
    this.selectedTypesChange.emit(this.selectedTypes);
    this.filterChange.emit();
  }

  onSearchInputChange() {
    this.searchQueryChange.emit(this.searchQuery);
    this.filterChange.emit();
  }

  setViewMode(mode: 'card' | 'table') {
    this.viewMode = mode;
    this.viewModeChange.emit(mode);
  }
}
