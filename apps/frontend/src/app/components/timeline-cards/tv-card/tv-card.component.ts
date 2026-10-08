import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NormalizedTimelineItem } from '@trackstar/data';

@Component({
  selector: 'trackstar-tv-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tv-card bg-gray-800 rounded-lg shadow p-4 flex gap-4">
      <img *ngIf="item.imageUrl" [src]="item.imageUrl" alt="Poster" class="w-16 h-24 object-cover rounded shadow-sm" />
      <div class="flex-1">
        <div class="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">TV Show</div>
        <h3 class="text-lg font-bold text-white">{{ item.title }}</h3>
        <p class="text-gray-400 text-sm" *ngIf="item.subtitle">{{ item.subtitle }}</p>
        
        <div class="mt-2 text-sm text-gray-300">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-200">
            {{ item.status }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class TvCardComponent {
  @Input() item!: NormalizedTimelineItem;
}
