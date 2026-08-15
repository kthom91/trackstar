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
         class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-sm animate-fade-in"
         role="dialog" 
         aria-modal="true" 
         aria-labelledby="modal-title"
         (keydown.escape)="closeModal()">
      
      <!-- Modal Panel -->
      <div class="relative w-full max-w-lg bg-[#131b2e] rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10 text-white animate-scale-up"
           (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-md">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <div>
              <h2 id="modal-title" class="text-lg font-bold font-['Outfit']">Log Media Entry</h2>
              <p class="text-[11px] text-gray-400">Record directly to your AT Protocol repository</p>
            </div>
          </div>

          <button (click)="closeModal()" 
                  class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Close modal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- If Not Logged In Warning -->
        <div *ngIf="!auth.isAuthenticated()" class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4 text-xs text-amber-300 flex items-center justify-between">
          <span>You must connect your PDS account to write records.</span>
        </div>

        <!-- Form Body -->
        <form (ngSubmit)="submitLog()" class="space-y-4">
          
          <!-- Media Type Selection -->
          <div>
            <label class="block text-[11px] font-semibold uppercase text-gray-400 mb-2 tracking-wider">Media Type</label>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" 
                      *ngFor="let type of mediaTypes" 
                      (click)="onMediaTypeChange(type.id)"
                      [class]="selectedType === type.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'"
                      class="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all">
                <ng-container [ngSwitch]="type.id">
                  <svg *ngSwitchCase="'movie'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
                  </svg>
                  <svg *ngSwitchCase="'book'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  <svg *ngSwitchCase="'concert'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                  </svg>
                </ng-container>
                <span>{{ type.label }}</span>
              </button>
            </div>
          </div>

          <!-- Title Input with Autocomplete Typeahead -->
          <div class="relative">
            <div class="flex items-center justify-between mb-1.5">
              <label for="media-title" class="block text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
                Title
              </label>
              <span *ngIf="selectedType === 'movie' && !hasTmdbKey" class="text-[10px] text-amber-400/80">
                (Add TMDB key in settings for movie search)
              </span>
              <span *ngIf="selectedType === 'concert' && !hasSetlistKey" class="text-[10px] text-amber-400/80">
                (Add setlist.fm key in Importers for live setlists)
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
                     class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#0b0f19] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm transition-all" />

              <!-- Spinner in input -->
              <div *ngIf="isLoadingSuggestions" class="absolute right-3.5 top-3">
                <div class="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
              </div>
            </div>

            <!-- Selected Metadata Item Chip -->
            <div *ngIf="selectedSuggestion" class="mt-2 p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between">
              <div class="flex items-center space-x-3 min-w-0">
                <img *ngIf="selectedSuggestion.coverUrl" [src]="selectedSuggestion.coverUrl" class="w-8 h-12 object-cover rounded-md bg-black/40 border border-white/10 shrink-0" />
                <div *ngIf="!selectedSuggestion.coverUrl" class="w-8 h-12 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                  <ng-container [ngSwitch]="selectedType">
                    <svg *ngSwitchCase="'movie'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
                    </svg>
                    <svg *ngSwitchCase="'book'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    <svg *ngSwitchCase="'concert'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                    </svg>
                  </ng-container>
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white truncate">{{ selectedSuggestion.title }} {{ selectedSuggestion.year ? '(' + selectedSuggestion.year + ')' : '' }}</div>
                  <div class="text-[11px] text-indigo-300 truncate">{{ selectedSuggestion.creator || selectedSuggestion.id }}</div>
                </div>
              </div>
              <button type="button" (click)="clearSelection()" class="text-gray-400 hover:text-white p-1 ml-2 text-xs" title="Clear selection">
                ✕
              </button>
            </div>

            <!-- Autocomplete Dropdown Panel -->
            <div *ngIf="showSuggestions && suggestions.length > 0" 
                 class="absolute left-0 right-0 top-full mt-1.5 bg-[#0e1626] border border-white/15 rounded-xl shadow-2xl z-30 max-h-64 overflow-y-auto divide-y divide-white/5 animate-fadeIn">
              
              <button type="button" 
                      *ngFor="let item of suggestions" 
                      (click)="selectSuggestion(item)"
                      class="w-full text-left p-2.5 hover:bg-white/10 flex items-start space-x-3 transition-colors group">
                
                <!-- Poster Thumbnail -->
                <img *ngIf="item.coverUrl" 
                     [src]="item.coverUrl" 
                     [alt]="item.title"
                     class="w-9 h-13 object-cover rounded-md bg-black/40 border border-white/10 shrink-0 group-hover:ring-1 group-hover:ring-indigo-400" />
                <div *ngIf="!item.coverUrl" class="w-9 h-13 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                  <ng-container [ngSwitch]="item.mediaType">
                    <svg *ngSwitchCase="'movie'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
                    </svg>
                    <svg *ngSwitchCase="'book'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    <svg *ngSwitchCase="'concert'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                    </svg>
                  </ng-container>
                </div>

                <!-- Text Details -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {{ item.title }}
                    </span>
                    <span *ngIf="item.year" class="text-[10px] text-gray-400 ml-1 font-mono shrink-0">
                      {{ item.year }}
                    </span>
                  </div>

                  <p *ngIf="item.creator" class="text-[11px] text-gray-300 truncate">
                    {{ item.creator }}
                  </p>

                  <p *ngIf="item.description" class="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                    {{ item.description }}
                  </p>
                </div>
              </button>
            </div>

          </div>

          <!-- Status -->
          <div>
            <label for="media-status" class="block text-[11px] font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">Status</label>
            <select id="media-status"
                    [(ngModel)]="status" 
                    name="status"
                    (ngModelChange)="onStatusChange($event)"
                    class="w-full px-4 py-2.5 rounded-xl bg-[#0b0f19] border border-white/10 text-white focus:outline-none focus:border-indigo-500 text-xs sm:text-sm transition-all">
              <option value="completed">Completed / Finished</option>
              <option value="consuming">Currently Consuming / In Progress</option>
              <option value="want_to_consume">Want to Consume / Watchlist</option>
            </select>
          </div>

          <!-- Date Completed (shown when status is completed) -->
          <div *ngIf="status === 'completed'">
            <div class="flex items-center justify-between mb-1.5">
              <label for="media-completed-date" class="block text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
                Date Completed
              </label>
              <button type="button" 
                      (click)="setToday()" 
                      class="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                Today
              </button>
            </div>
            <input id="media-completed-date"
                   type="date" 
                   [(ngModel)]="completedDate" 
                   name="completedDate"
                   class="w-full px-4 py-2.5 rounded-xl bg-[#0b0f19] border border-white/10 text-white focus:outline-none focus:border-indigo-500 text-xs sm:text-sm transition-all [color-scheme:dark]" />
          </div>

          <!-- Rating -->
          <div>
            <label class="block text-[11px] font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">Rating (Optional)</label>
            <div class="flex items-center space-x-2">
              <button type="button" 
                      *ngFor="let star of [1, 2, 3, 4, 5]" 
                      (click)="rating = (rating === star ? null : star)"
                      class="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none">
                <span [class]="(rating && rating >= star) ? 'text-amber-400' : 'text-gray-600'">★</span>
              </button>
              <span *ngIf="rating" class="text-xs font-medium text-amber-400 ml-2 font-mono">{{ rating }}/5 Stars</span>
            </div>
          </div>

          <!-- Review / Notes -->
          <div>
            <label for="media-review" class="block text-[11px] font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">Review / Notes (Optional)</label>
            <textarea id="media-review"
                      [(ngModel)]="review" 
                      name="review"
                      rows="3"
                      placeholder="Write your thoughts..."
                      class="w-full px-4 py-2.5 rounded-xl bg-[#0b0f19] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm transition-all"></textarea>
          </div>

          <!-- Error Alert -->
          <div *ngIf="submitError" class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
            {{ submitError }}
          </div>

          <!-- Submit Buttons -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button type="button" 
                    (click)="closeModal()"
                    class="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" 
                    [disabled]="!title.trim() || isSubmitting || !auth.isAuthenticated()"
                    class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2">
              <div *ngIf="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

  get hasSetlistKey(): boolean {
    return Boolean(this.metadata.getSetlistApiKey());
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
