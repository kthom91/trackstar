import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdsUserLog, getCoverUrl, getSubtitle, getTypeIcon, getParsedMetadata } from '@trackstar/data';
import { getItemExternalUrl } from '@trackstar/integrations';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border border-[rgba(14,14,14,0.24)] bg-[#faf7f2] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#0e0e0e] hover:shadow-lg transition-all group h-full">
      
      <div>
        <!-- Top Type Tag & Delete Action -->
        <div class="flex items-center justify-between px-3.5 py-2.5">
          <span class="font-mono text-[10px] uppercase font-semibold tracking-widest text-[#9a8f7e]">
            {{ log.mediaItem?.mediaType }}
          </span>

          <button (click)="onDelete($event)"
                  title="Delete entry from PDS"
                  class="opacity-0 group-hover:opacity-100 text-[#9a8f7e] hover:text-red-700 transition-opacity p-0.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>

        <!-- Poster / Cover Image (Portrait 2:3 Aspect Ratio) -->
        <a [href]="externalUrl" 
           target="_blank" 
           rel="noopener noreferrer" 
           class="block relative overflow-hidden bg-[#0e0e0e]/5 aspect-[2/3] w-full border-y border-[rgba(14,14,14,0.08)]"
           [title]="'View on ' + providerName">
          <img *ngIf="coverUrl" 
               [src]="coverUrl" 
               [alt]="log.mediaItem?.title" 
               class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102" />
          
          <!-- Fallback Placeholder -->
          <div *ngIf="!coverUrl" 
               class="w-full h-full bg-[#f0ede6] flex flex-col items-center justify-center p-4 text-center">
            <span class="text-3xl mb-2 opacity-70">{{ typeIcon }}</span>
            <span class="text-xs font-mono text-[#3d3830] line-clamp-3 px-2">{{ log.mediaItem?.title }}</span>
          </div>
        </a>

        <!-- Card Body -->
        <div class="p-3.5 space-y-1.5">
          <!-- Title Link -->
          <a [href]="externalUrl" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="group/title block cursor-pointer"
             [title]="'View on ' + providerName">
            <h3 class="font-serif font-bold text-base text-[#0e0e0e] group-hover/title:text-neutral-700 leading-snug flex items-start justify-between">
              <span class="line-clamp-2">{{ log.mediaItem?.title }}</span>
              <svg class="w-3.5 h-3.5 text-[#9a8f7e] group-hover/title:text-[#0e0e0e] shrink-0 ml-1.5 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </h3>
          </a>

          <!-- Creator / Venue Subtitle -->
          <p *ngIf="subtitle" class="font-mono text-xs text-[#9a8f7e] truncate">
            {{ subtitle }}
          </p>

          <!-- Date -->
          <p class="font-mono text-xs text-[#9a8f7e]">
            {{ datePrefix ? datePrefix + ' ' : '' }}{{ (log.completedAt || log.loggedAt) | date:'mediumDate' }}
          </p>

          <!-- Star Rating -->
          <div *ngIf="showRating && log.rating" class="flex items-center space-x-0.5 pt-0.5">
            <span *ngFor="let star of [1,2,3,4,5]" 
                  [class]="star <= log.rating ? 'text-[#0e0e0e]' : 'text-[rgba(14,14,14,0.18)]'" 
                  class="text-xs">
              ★
            </span>
          </div>

          <!-- Review Quote -->
          <p *ngIf="showReview && log.review" class="text-xs italic text-[#3d3830] bg-[rgba(14,14,14,0.04)] p-2.5 rounded-xl mt-2 font-serif border border-[rgba(14,14,14,0.14)] line-clamp-3">
            "{{ log.review }}"
          </p>
        </div>
      </div>

      <!-- Optional Bottom Action Footer (e.g. Want-to-Consume completion) -->
      <div *ngIf="showCompleteAction" class="px-3.5 py-3 border-t border-[rgba(14,14,14,0.14)] flex items-center justify-between bg-white/40">
        <span class="font-mono text-xs text-[#9a8f7e]">Watchlist</span>
        <button (click)="onComplete($event)"
                title="Mark as completed on PDS"
                class="px-3 py-1.5 rounded-xl bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] font-mono text-xs font-semibold shadow-xs transition-all active:scale-95">
          ✓ Complete
        </button>
      </div>

    </div>
  `
})
export class MediaCardComponent {
  @Input({ required: true }) log!: PdsUserLog;
  @Input() showCompleteAction = false;
  @Input() showRating = true;
  @Input() showReview = true;
  @Input() datePrefix = '';

  @Output() delete = new EventEmitter<PdsUserLog>();
  @Output() complete = new EventEmitter<PdsUserLog>();

  get coverUrl(): string | null {
    return getCoverUrl(this.log);
  }

  get subtitle(): string | null {
    return getSubtitle(this.log);
  }

  get typeIcon(): string {
    return getTypeIcon(this.log.mediaItem?.mediaType);
  }

  get externalUrl(): string {
    return getItemExternalUrl({
      title: this.log.mediaItem?.title,
      source: this.log.source,
      mediaType: this.log.mediaItem?.mediaType,
      metadata: getParsedMetadata(this.log)
    });
  }

  get providerName(): string {
    return (this.log as any).sourceDisplayName || 'External Provider';
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit(this.log);
  }

  onComplete(event: Event) {
    event.stopPropagation();
    this.complete.emit(this.log);
  }
}
