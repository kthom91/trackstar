import { Component, input, output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { PdsRepositoryService } from '../../services/pds-repo.service';
import { PdsAuthService } from '../../services/pds-auth.service';
import { DirectMetadataService, AutocompleteItem } from '../../services/direct-metadata.service';

@Component({
  selector: 'app-log-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen()" 
         class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#0e0e0e]/40 backdrop-blur-xs animate-fade-in"
         role="dialog" 
         aria-modal="true" 
         aria-labelledby="modal-title"
         (keydown.escape)="closeModal()">
      
      <!-- Modal Panel -->
      <div class="relative w-full max-w-lg bg-[#faf7f2] rounded-2xl p-6 sm:p-8 shadow-2xl border border-[rgba(14,14,14,0.24)] text-[#0e0e0e] animate-scale-up"
           (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-[rgba(14,14,14,0.14)] mb-6">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl bg-[#0e0e0e] text-[#f0ede6] flex items-center justify-center font-bold text-xs shadow-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <div>
              <h2 id="modal-title" class="text-xl font-serif font-bold text-[#0e0e0e]">Log Media Entry</h2>
              <p class="text-[11px] font-mono text-[#9a8f7e]">Record directly to your AT Protocol repository</p>
            </div>
          </div>

          <button (click)="closeModal()" 
                  class="text-[#9a8f7e] hover:text-[#0e0e0e] p-1.5 rounded-lg hover:bg-[#0e0e0e]/5 transition-colors"
                  aria-label="Close modal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- If Not Logged In Warning -->
        <div *ngIf="!auth.isAuthenticated()" class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 text-xs font-mono text-amber-900 flex items-center justify-between">
          <span>You must connect your PDS account to write records.</span>
        </div>

        <!-- Form Body -->
        <form (ngSubmit)="submitLog()" class="space-y-4">
          
          <!-- Media Type Selection -->
          <div>
            <label class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] mb-2 tracking-wider">Media Type</label>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" 
                      *ngFor="let type of mediaTypes" 
                      (click)="onMediaTypeChange(type.id)"
                      [class]="selectedType === type.id ? 'bg-[#0e0e0e] border-[#0e0e0e] text-[#f0ede6] shadow-sm font-bold' : 'bg-[#faf7f2] border-[rgba(14,14,14,0.24)] text-[#3d3830] hover:text-[#0e0e0e] hover:bg-[#f0ede6]'"
                      class="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border font-mono text-xs transition-all">
                <ng-container [ngSwitch]="type.id">
                  <svg *ngSwitchCase="'movie'" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
                  </svg>
                  <svg *ngSwitchCase="'book'" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  <svg *ngSwitchCase="'concert'" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                  </svg>
                </ng-container>
                <span>{{ type.label }}</span>
              </button>
            </div>
          </div>

          <!-- Title Input with Autocomplete Typeahead -->
          <div class="relative">
            <div class="flex items-center justify-between mb-1">
              <label for="media-title" class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] tracking-wider">
                Title
              </label>
              <span *ngIf="selectedType === 'movie' && !hasTmdbKey" class="text-[10px] font-mono text-[#9a8f7e]">
                (Add TMDB key in settings for lookup)
              </span>
              <span *ngIf="selectedType === 'concert' && !hasLastfmKey" class="text-[10px] font-mono text-[#9a8f7e]">
                (Add Last.fm key in settings for lookup)
              </span>
            </div>

            <!-- Input Container -->
            <div class="relative">
              <input id="media-title"
                     type="text" 
                     [(ngModel)]="title" 
                     (ngModelChange)="onTitleInput($event)"
                     name="title"
                     required
                     autocomplete="off"
                     [placeholder]="getPlaceholder()"
                     class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-[rgba(14,14,14,0.24)] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e] font-mono text-xs transition-all shadow-xs" />

              <!-- Spinner in input -->
              <div *ngIf="isLoadingSuggestions" class="absolute right-3.5 top-3">
                <div class="w-4 h-4 border-2 border-[rgba(14,14,14,0.14)] border-t-[#0e0e0e] rounded-full animate-spin"></div>
              </div>
            </div>

            <!-- Selected Metadata Item Chip -->
            <div *ngIf="selectedSuggestion" class="mt-2 p-2.5 bg-[#f0ede6] border border-[rgba(14,14,14,0.14)] rounded-xl flex items-center justify-between">
              <div class="flex items-center space-x-3 min-w-0">
                <img *ngIf="selectedSuggestion.coverUrl" [src]="selectedSuggestion.coverUrl" class="w-8 h-10 object-cover rounded bg-[rgba(14,14,14,0.1)] border border-[rgba(14,14,14,0.14)] shrink-0" />
                <div *ngIf="!selectedSuggestion.coverUrl" class="w-8 h-10 rounded bg-[#faf7f2] border border-[rgba(14,14,14,0.14)] flex items-center justify-center text-[#9a8f7e] shrink-0">
                  <span class="text-xs">{{ getTypeIcon(selectedType) }}</span>
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-serif font-bold text-[#0e0e0e] truncate">{{ selectedSuggestion.title }} {{ selectedSuggestion.year ? '(' + selectedSuggestion.year + ')' : '' }}</div>
                  <div class="text-[11px] font-mono text-[#9a8f7e] truncate">{{ selectedSuggestion.creator || selectedSuggestion.id }}</div>
                </div>
              </div>
              <button type="button" (click)="clearSelection()" class="text-[#9a8f7e] hover:text-[#0e0e0e] p-1 ml-2 text-xs" title="Clear selection">
                ✕
              </button>
            </div>

            <!-- Autocomplete Dropdown Panel -->
            <div *ngIf="showSuggestions && suggestions.length > 0" 
                 class="absolute left-0 right-0 top-full mt-1.5 bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-[rgba(14,14,14,0.14)] animate-fadeIn">
              
              <button type="button" 
                      *ngFor="let item of suggestions" 
                      (click)="selectSuggestion(item)"
                      class="w-full text-left p-2.5 hover:bg-white flex items-start space-x-3 transition-colors group">
                
                <!-- Poster Thumbnail -->
                <img *ngIf="item.coverUrl" 
                     [src]="item.coverUrl" 
                     [alt]="item.title"
                     class="w-8 h-11 object-cover rounded bg-[rgba(14,14,14,0.1)] border border-[rgba(14,14,14,0.14)] shrink-0" />
                <div *ngIf="!item.coverUrl" class="w-8 h-11 rounded bg-white border border-[rgba(14,14,14,0.14)] flex items-center justify-center text-[#9a8f7e] shrink-0">
                  <span class="text-xs">{{ getTypeIcon(item.mediaType) }}</span>
                </div>

                <!-- Text Details -->
                <div class="min-w-0 flex-1 font-mono">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#0e0e0e] group-hover:underline truncate">
                      {{ item.title }}
                    </span>
                    <span *ngIf="item.year" class="text-[10px] text-[#9a8f7e] ml-1 shrink-0">
                      {{ item.year }}
                    </span>
                  </div>

                  <p *ngIf="item.creator" class="text-[11px] text-[#3d3830] truncate">
                    {{ item.creator }}
                  </p>

                  <p *ngIf="item.description" class="text-[10px] text-[#9a8f7e] line-clamp-1 mt-0.5">
                    {{ item.description }}
                  </p>
                </div>
              </button>
            </div>

          </div>

          <!-- Status -->
          <div>
            <label for="media-status" class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] mb-1 tracking-wider">Status</label>
            <select id="media-status"
                    [(ngModel)]="status" 
                    name="status"
                    (ngModelChange)="onStatusChange($event)"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[rgba(14,14,14,0.24)] text-[#0e0e0e] focus:outline-none focus:border-[#0e0e0e] font-mono text-xs transition-all">
              <option value="completed">Completed / Finished</option>
              <option value="consuming">Currently Consuming / In Progress</option>
              <option value="want_to_consume">Want to Consume / Watchlist</option>
            </select>
          </div>

          <!-- Date Completed (shown when status is completed) -->
          <div *ngIf="status === 'completed'">
            <div class="flex items-center justify-between mb-1">
              <label for="media-completed-date" class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] tracking-wider">
                Date Completed
              </label>
              <button type="button" 
                      (click)="setToday()" 
                      class="text-[10px] font-mono text-[#0e0e0e] hover:underline font-medium">
                Today
              </button>
            </div>
            <input id="media-completed-date"
                   type="date" 
                   [(ngModel)]="completedDate" 
                   name="completedDate"
                   class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[rgba(14,14,14,0.24)] text-[#0e0e0e] focus:outline-none focus:border-[#0e0e0e] font-mono text-xs transition-all" />
          </div>

          <!-- Rating -->
          <div>
            <label class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] mb-1 tracking-wider">Rating (Optional)</label>
            <div class="flex items-center space-x-1.5">
              <button type="button" 
                      *ngFor="let star of [1, 2, 3, 4, 5]" 
                      (click)="rating = (rating === star ? null : star)"
                      class="p-0.5 text-2xl transition-transform hover:scale-125 focus:outline-none">
                <span [class]="(rating && rating >= star) ? 'text-[#0e0e0e]' : 'text-[rgba(14,14,14,0.18)]'">★</span>
              </button>
              <span *ngIf="rating" class="text-xs font-bold text-[#0e0e0e] ml-2 font-mono">{{ rating }}/5 Stars</span>
            </div>
          </div>

          <!-- Review / Notes -->
          <div>
            <label for="media-review" class="block text-[10px] font-mono font-bold uppercase text-[#3d3830] mb-1 tracking-wider">Review / Notes (Optional)</label>
            <textarea id="media-review"
                      [(ngModel)]="review" 
                      name="review"
                      rows="3"
                      placeholder="Write your thoughts..."
                      class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[rgba(14,14,14,0.24)] text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e] font-serif text-xs transition-all"></textarea>
          </div>

          <!-- Error Alert -->
          <div *ngIf="submitError" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl font-mono text-xs text-rose-900">
            {{ submitError }}
          </div>

          <!-- Submit Buttons -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-[rgba(14,14,14,0.14)]">
            <button type="button" 
                    (click)="closeModal()"
                    class="px-4 py-2 rounded-xl font-mono text-xs text-[#3d3830] hover:text-[#0e0e0e] hover:bg-[#0e0e0e]/5 transition-colors">
              Cancel
            </button>
            <button type="submit" 
                    [disabled]="!title.trim() || isSubmitting || !auth.isAuthenticated()"
                    class="px-5 py-2 rounded-xl bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-40 text-[#f0ede6] font-mono font-semibold text-xs shadow-sm transition-all flex items-center space-x-2">
              <div *ngIf="isSubmitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ isSubmitting ? 'Saving to PDS...' : 'Save to PDS' }}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  `
})
export class LogModalComponent implements OnInit, OnDestroy {
  isOpen = input<boolean>(false);
  close = output<void>();
  saved = output<void>();

  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);
  metadata = inject(DirectMetadataService);

  selectedType = 'movie';
  title = '';
  status = 'completed';
  completedDate: string = this.getTodayDateString();
  rating: number | null = null;
  review = '';
  isSubmitting = false;
  submitError: string | null = null;

  suggestions: AutocompleteItem[] = [];
  showSuggestions = false;
  isLoadingSuggestions = false;
  selectedSuggestion: AutocompleteItem | null = null;

  getTypeIcon(type?: string): string {
    switch (type) {
      case 'book': return '📚';
      case 'movie': return '🎬';
      case 'concert': return '🎟️';
      default: return '🌟';
    }
  }

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  mediaTypes = [
    { id: 'movie', label: 'Movie' },
    { id: 'book', label: 'Book' },
    { id: 'concert', label: 'Concert' }
  ];

  get hasTmdbKey(): boolean {
    return Boolean(this.metadata.getTmdbApiKey());
  }

  get hasLastfmKey(): boolean {
    return Boolean(this.metadata.getLastfmApiKey());
  }

  getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  setToday() {
    this.completedDate = this.getTodayDateString();
  }

  onStatusChange(newStatus: string) {
    if (newStatus === 'completed' && !this.completedDate) {
      this.completedDate = this.getTodayDateString();
    }
  }

  ngOnInit() {
    this.searchSub = this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(async (query) => {
      if (!query || query.length < 2 || this.selectedSuggestion) {
        this.suggestions = [];
        this.showSuggestions = false;
        this.isLoadingSuggestions = false;
        return;
      }

      this.isLoadingSuggestions = true;
      try {
        this.suggestions = await this.metadata.searchAutocomplete(this.selectedType, query);
        this.showSuggestions = this.suggestions.length > 0;
      } catch (err) {
        console.warn('Autocomplete search failed:', err);
        this.suggestions = [];
      } finally {
        this.isLoadingSuggestions = false;
      }
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  onTitleInput(val: string) {
    if (this.selectedSuggestion && val !== this.selectedSuggestion.title) {
      this.selectedSuggestion = null;
    }
    this.searchSubject.next(val);
  }

  selectSuggestion(item: AutocompleteItem) {
    this.selectedSuggestion = item;
    this.title = item.title;
    this.showSuggestions = false;
    this.suggestions = [];
  }

  clearSelection() {
    this.selectedSuggestion = null;
  }

  onMediaTypeChange(type: string) {
    this.selectedType = type;
    this.selectedSuggestion = null;
    this.suggestions = [];
    this.showSuggestions = false;
    if (this.title.trim().length >= 2) {
      this.searchSubject.next(this.title.trim());
    }
  }

  getPlaceholder(): string {
    switch (this.selectedType) {
      case 'movie': return 'Search movie title (e.g. Dune, Inception)...';
      case 'book': return 'Search book title or author (e.g. Neuromancer)...';
      case 'concert': return 'Search band / artist (e.g. Radiohead)...';
      default: return 'Enter title...';
    }
  }



  closeModal() {
    this.close.emit();
    this.resetForm();
  }

  async submitLog() {
    if (!this.title.trim() || !this.auth.isAuthenticated()) return;
    this.isSubmitting = true;
    this.submitError = null;

    try {
      let completedAt: string | undefined = undefined;
      if (this.status === 'completed' && this.completedDate) {
        const todayStr = this.getTodayDateString();
        if (this.completedDate === todayStr) {
          completedAt = new Date().toISOString();
        } else {
          // Construct local midday timestamp to prevent timezone day-shift
          completedAt = new Date(`${this.completedDate}T12:00:00`).toISOString();
        }
      }

      await this.repo.createLog({
        mediaType: this.selectedType,
        title: this.title.trim(),
        status: this.status,
        rating: this.rating || undefined,
        review: this.review.trim() || undefined,
        completedAt: completedAt,
        mediaItemId: this.selectedSuggestion?.id,
        metadataJson: this.selectedSuggestion?.metadataJson
      });
      this.saved.emit();
      this.closeModal();
    } catch (err: any) {
      console.error('Failed to log media:', err);
      this.submitError = err?.message || 'Failed to save record to PDS';
    } finally {
      this.isSubmitting = false;
    }
  }

  resetForm() {
    this.selectedType = 'movie';
    this.title = '';
    this.status = 'completed';
    this.completedDate = this.getTodayDateString();
    this.rating = null;
    this.review = '';
    this.submitError = null;
    this.suggestions = [];
    this.showSuggestions = false;
    this.selectedSuggestion = null;
    this.isLoadingSuggestions = false;
  }
}
