import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-log-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen()" 
         class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm animate-fade-in"
         role="dialog" 
         aria-modal="true" 
         aria-labelledby="modal-title"
         (keydown.escape)="closeModal()">
      
      <!-- Modal Panel -->
      <div class="relative w-full max-w-lg glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10 text-white animate-scale-up"
           (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <h2 id="modal-title" class="text-xl font-bold font-['Outfit']">Log Media Entry</h2>
          </div>

          <button (click)="closeModal()" 
                  class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Close modal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Form Body -->
        <form (ngSubmit)="submitLog()" class="space-y-5">
          
          <!-- Media Type Selection -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-400 mb-2 tracking-wider">Media Type</label>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" 
                      *ngFor="let type of mediaTypes" 
                      (click)="selectedType = type.id"

                      [class]="selectedType === type.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'"
                      class="flex items-center justify-center py-2.5 px-3 rounded-xl border text-sm font-medium transition-all">
                <span>{{ type.label }}</span>
              </button>
            </div>
          </div>


          <!-- Title -->
          <div>
            <label for="media-title" class="block text-xs font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">Title</label>
            <input id="media-title"
                   type="text" 
                   [(ngModel)]="title" 
                   name="title"
                   required
                   placeholder="e.g. Dune, Interstellar, The Beatles..."
                   class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all" />
          </div>

          <!-- Status -->
          <div>
            <label for="media-status" class="block text-xs font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">Status</label>
            <select id="media-status"
                    [(ngModel)]="status" 
                    name="status"
                    class="w-full px-4 py-2.5 rounded-xl bg-[#111827] border border-white/10 text-white focus:outline-none focus:border-indigo-500 text-sm transition-all">
              <option value="completed">Completed / Finished</option>
              <option value="consuming">Currently Consuming / In Progress</option>
              <option value="want_to_consume">Want to Consume / Watchlist</option>
            </select>
          </div>

          <!-- Rating -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">Rating (Optional)</label>
            <div class="flex items-center space-x-2">
              <button type="button" 
                      *ngFor="let star of [1, 2, 3, 4, 5]" 
                      (click)="rating = (rating === star ? null : star)"

                      class="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none">
                <span [class]="(rating && rating >= star) ? 'text-amber-400' : 'text-gray-600'">★</span>
              </button>
              <span *ngIf="rating" class="text-xs font-medium text-amber-400 ml-2">{{ rating }}/5 Stars</span>
            </div>
          </div>

          <!-- Review / Notes -->
          <div>
            <label for="media-review" class="block text-xs font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">Review / Notes (Optional)</label>
            <textarea id="media-review"
                      [(ngModel)]="review" 
                      name="review"
                      rows="3"
                      placeholder="Write your thoughts..."
                      class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"></textarea>
          </div>

          <!-- Submit Buttons -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button type="button" 
                    (click)="closeModal()"
                    class="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" 
                    [disabled]="!title.trim() || isSubmitting"
                    class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all">
              <span *ngIf="!isSubmitting">Save Entry</span>
              <span *ngIf="isSubmitting">Saving...</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  `
})
export class LogModalComponent {
  isOpen = input<boolean>(false);
  close = output<void>();
  saved = output<void>();

  private api = inject(ApiService);

  selectedType = 'book';
  title = '';
  status = 'completed';
  rating: number | null = null;
  review = '';
  isSubmitting = false;

  mediaTypes = [
    { id: 'book', label: 'Book' },
    { id: 'movie', label: 'Movie' },
    { id: 'concert', label: 'Concert' }
  ];


  closeModal() {
    this.close.emit();
    this.resetForm();
  }

  submitLog() {
    if (!this.title.trim()) return;
    this.isSubmitting = true;

    this.api.createLog({
      media_type: this.selectedType,
      title: this.title.trim(),
      status: this.status,
      rating: this.rating || undefined,
      review: this.review.trim() || undefined
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.saved.emit();
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to log media:', err);
        this.isSubmitting = false;
      }
    });
  }

  resetForm() {
    this.selectedType = 'book';
    this.title = '';
    this.status = 'completed';
    this.rating = null;
    this.review = '';
  }
}
