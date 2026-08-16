import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdsUserLog, getCoverUrl, getSubtitle, getTypeIcon, getParsedMetadata } from '@trackstar/data';
import { getItemExternalUrl } from '@trackstar/integrations';

@Component({
  selector: 'app-media-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border border-[rgba(14,14,14,0.24)] bg-[#faf7f2] rounded-xl overflow-hidden shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left font-mono text-xs border-collapse">
          <thead class="bg-[#f0ede6] text-[#3d3830] uppercase tracking-wider font-semibold border-b border-[rgba(14,14,14,0.14)] text-[10px]">
            <tr>
              <th scope="col" class="py-3 px-4 w-12">Cover</th>
              <th scope="col" class="py-3 px-4">Type</th>
              <th scope="col" class="py-3 px-4">Title</th>
              <th scope="col" class="py-3 px-4">Creator / Venue</th>
              <th *ngIf="showRating" scope="col" class="py-3 px-4">Rating</th>
              <th scope="col" class="py-3 px-4">{{ dateHeader }}</th>
              <th scope="col" class="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[rgba(14,14,14,0.14)]">
            <tr *ngFor="let log of logs" class="hover:bg-white/60 transition-colors">
              
              <!-- Cover Column -->
              <td class="py-2 px-4">
                <img *ngIf="getCover(log) as cover" 
                     [src]="cover" 
                     [alt]="log.mediaItem?.title" 
                     class="w-8 h-10 object-cover rounded bg-[rgba(14,14,14,0.1)] border border-[rgba(14,14,14,0.14)]" />
                <div *ngIf="!getCover(log)" class="w-8 h-10 bg-[#f0ede6] rounded flex items-center justify-center text-[10px] text-[#9a8f7e]">
                  {{ getTypeEmoji(log.mediaItem?.mediaType) }}
                </div>
              </td>

              <!-- Type Column -->
              <td class="py-2 px-4 uppercase text-[10px] font-semibold text-[#9a8f7e]">
                {{ log.mediaItem?.mediaType }}
              </td>

              <!-- Title Link Column -->
              <td class="py-2 px-4 font-serif font-bold text-[#0e0e0e] max-w-xs truncate text-sm">
                <a [href]="getUrl(log)" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="hover:underline inline-flex items-center space-x-1" 
                   [title]="'View on ' + getSource(log)">
                  <span>{{ log.mediaItem?.title }}</span>
                  <svg class="w-3 h-3 text-[#9a8f7e]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </a>
              </td>

              <!-- Subtitle Column -->
              <td class="py-2 px-4 text-[#3d3830]">
                {{ getSub(log) || '—' }}
              </td>

              <!-- Rating Column -->
              <td *ngIf="showRating" class="py-2 px-4 whitespace-nowrap">
                <div *ngIf="log.rating" class="flex items-center space-x-0.5">
                  <span *ngFor="let star of [1,2,3,4,5]" 
                        [class]="star <= log.rating ? 'text-[#0e0e0e]' : 'text-[rgba(14,14,14,0.18)]'" 
                        class="text-xs">
                    ★
                  </span>
                </div>
                <span *ngIf="!log.rating" class="text-[#9a8f7e]">—</span>
              </td>

              <!-- Date Column -->
              <td class="py-2 px-4 text-[#9a8f7e] whitespace-nowrap">
                {{ (log.completedAt || log.loggedAt) | date:'mediumDate' }}
              </td>

              <!-- Actions Column -->
              <td class="py-2 px-4 text-right whitespace-nowrap">
                <button *ngIf="showCompleteAction" 
                        (click)="onComplete(log, $event)"
                        title="Mark completed"
                        class="px-2.5 py-1 rounded-lg bg-[#0e0e0e] text-[#f0ede6] text-[10px] font-mono font-semibold hover:bg-neutral-800 transition-all mr-2 shadow-xs">
                  ✓ Complete
                </button>
                <button (click)="onDelete(log, $event)" 
                        title="Delete log from PDS"
                        class="text-[#9a8f7e] hover:text-red-700 p-1">
                  ✕
                </button>
              </td>

            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class MediaTableComponent {
  @Input({ required: true }) logs: PdsUserLog[] = [];
  @Input() showCompleteAction = false;
  @Input() showRating = true;
  @Input() dateHeader = 'Date';

  @Output() delete = new EventEmitter<PdsUserLog>();
  @Output() complete = new EventEmitter<PdsUserLog>();

  getCover(log: PdsUserLog): string | null {
    return getCoverUrl(log);
  }

  getSub(log: PdsUserLog): string | null {
    return getSubtitle(log);
  }

  getTypeEmoji(type?: string): string {
    return getTypeIcon(type);
  }

  getSource(log: PdsUserLog): string {
    return (log as any).sourceDisplayName || 'External Provider';
  }

  getUrl(log: PdsUserLog): string {
    return getItemExternalUrl({
      title: log.mediaItem?.title,
      source: log.source,
      mediaType: log.mediaItem?.mediaType,
      metadata: getParsedMetadata(log)
    });
  }

  onDelete(log: PdsUserLog, event: Event) {
    event.stopPropagation();
    this.delete.emit(log);
  }

  onComplete(log: PdsUserLog, event: Event) {
    event.stopPropagation();
    this.complete.emit(log);
  }
}
