import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as Papa from 'papaparse';
import { PdsRepositoryService } from '../../services/pds-repo.service';
import { PdsAuthService } from '../../services/pds-auth.service';
import { DirectMetadataService } from '../../services/direct-metadata.service';

export interface ImportTaskStatus {
  source: string;
  total: number;
  processed: number;
  inProgress: boolean;
  success: boolean;
  errorMessage?: string;
}

@Component({
  selector: 'app-importers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">Direct PDS Importers</h1>
          <p class="text-gray-400 text-xs sm:text-sm mt-1">
            Import your media history directly into your AT Protocol Personal Data Server with client-side processing.
          </p>
        </div>
        
        <div *ngIf="!auth.isAuthenticated()" class="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
          Connect your PDS account to enable imports
        </div>
      </div>

      <!-- Importers Grid: 3 Equal Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- 1. StoryGraph CSV Importer -->
        <div class="bg-[#131b2e]/60 rounded-3xl p-6 border border-white/10 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-lg">
                📖
              </div>
              <div>
                <h3 class="text-base font-bold text-white font-['Outfit']">StoryGraph CSV</h3>
                <p class="text-[11px] text-gray-400">Books export from StoryGraph</p>
              </div>
            </div>

            <p class="text-xs text-gray-300 mb-4 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
              Parses <code class="text-teal-300">read</code>, <code class="text-teal-300">currently-reading</code>, and <code class="text-teal-300">to-read</code> shelves with ISBNs, 1-5 ratings, and reviews.
            </p>

            <div class="border-2 border-dashed border-white/20 hover:border-teal-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-white/5">
              <input type="file" 
                     accept=".csv"
                     [disabled]="!auth.isAuthenticated() || isImporting"
                     (change)="onStorygraphFileSelected($event)" 
                     class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
              <svg class="w-7 h-7 text-teal-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <span class="text-xs font-medium text-gray-300">Upload StoryGraph CSV</span>
            </div>
          </div>

          <div *ngIf="storygraphStatus" class="mt-4 p-3.5 rounded-xl text-xs"
               [ngClass]="storygraphStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (storygraphStatus.inProgress ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')">
            <div class="flex items-center justify-between mb-1">
              <span class="font-semibold">{{ storygraphStatus.inProgress ? 'Importing to PDS...' : (storygraphStatus.success ? 'Import Complete' : 'Import Error') }}</span>
              <span class="font-mono">{{ storygraphStatus.processed }} / {{ storygraphStatus.total }}</span>
            </div>
            <div *ngIf="storygraphStatus.inProgress" class="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div class="bg-teal-400 h-1.5 transition-all duration-200" [style.width.%]="(storygraphStatus.processed / (storygraphStatus.total || 1)) * 100"></div>
            </div>
          </div>
        </div>

        <!-- 2. Letterboxd CSV Importer -->
        <div class="bg-[#131b2e]/60 rounded-3xl p-6 border border-white/10 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-lg">
                🎬
              </div>
              <div>
                <h3 class="text-base font-bold text-white font-['Outfit']">Letterboxd CSV</h3>
                <p class="text-[11px] text-gray-400">Diary / Watchlist CSVs</p>
              </div>
            </div>

            <p class="text-xs text-gray-300 mb-4 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
              Upload <code class="text-orange-300">diary.csv</code>, <code class="text-orange-300">watched.csv</code>, or <code class="text-orange-300">watchlist.csv</code> to import film diary entries.
            </p>

            <div class="border-2 border-dashed border-white/20 hover:border-orange-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-white/5">
              <input type="file" 
                     accept=".csv"
                     [disabled]="!auth.isAuthenticated() || isImporting"
                     (change)="onLetterboxdFileSelected($event)" 
                     class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
              <svg class="w-7 h-7 text-orange-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <span class="text-xs font-medium text-gray-300">Upload Letterboxd CSV</span>
            </div>
          </div>

          <div *ngIf="letterboxdStatus" class="mt-4 p-3.5 rounded-xl text-xs"
               [ngClass]="letterboxdStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (letterboxdStatus.inProgress ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')">
            <div class="flex items-center justify-between mb-1">
              <span class="font-semibold">{{ letterboxdStatus.inProgress ? 'Importing to PDS...' : (letterboxdStatus.success ? 'Import Complete' : 'Import Error') }}</span>
              <span class="font-mono">{{ letterboxdStatus.processed }} / {{ letterboxdStatus.total }}</span>
            </div>
            <div *ngIf="letterboxdStatus.inProgress" class="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div class="bg-orange-400 h-1.5 transition-all duration-200" [style.width.%]="(letterboxdStatus.processed / (letterboxdStatus.total || 1)) * 100"></div>
            </div>
          </div>
        </div>

        <!-- 3. setlist.fm Direct API Connector -->
        <div class="bg-[#131b2e]/60 rounded-3xl p-6 border border-white/10 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg">
                🎟️
              </div>
              <div>
                <h3 class="text-base font-bold text-white font-['Outfit']">setlist.fm Connector</h3>
                <p class="text-[11px] text-gray-400">Direct API sync for attended concerts</p>
              </div>
            </div>

            <p class="text-xs text-gray-300 mb-4 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
              Sync attended live concerts, dates, venues, setlists, and band artwork directly from setlist.fm.
            </p>

            <!-- API Credentials Inputs (Stored in LocalStorage) -->
            <div class="space-y-3 mb-4">
              <div>
                <label for="setlist-username" class="block text-[10px] font-semibold uppercase text-gray-400 mb-1 tracking-wider">setlist.fm Username</label>
                <input id="setlist-username"
                       type="text" 
                       [(ngModel)]="setlistUserId" 
                       (change)="onSetlistCredentialsChange()"
                       placeholder="e.g. your_setlist_user"
                       class="w-full px-3.5 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-emerald-500 transition-all font-mono" />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="setlist-api-key" class="block text-[10px] font-semibold uppercase text-gray-400 tracking-wider">API Key</label>
                  <a href="https://www.setlist.fm/settings/api" target="_blank" rel="noopener noreferrer" class="text-[10px] text-emerald-400 hover:underline">Get Free Key ↗</a>
                </div>
                <input id="setlist-api-key"
                       type="password" 
                       [(ngModel)]="setlistApiKey" 
                       (change)="onSetlistCredentialsChange()"
                       placeholder="Enter setlist.fm API key..."
                       class="w-full px-3.5 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-emerald-500 transition-all font-mono" />
              </div>
            </div>

            <button (click)="syncSetlistFm()"
                    [disabled]="!auth.isAuthenticated() || isImporting || !setlistUserId.trim() || !setlistApiKey.trim()"
                    class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2">
              <div *ngIf="setlistStatus?.inProgress" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ setlistStatus?.inProgress ? 'Syncing Concerts...' : 'Sync Attended Concerts' }}</span>
            </button>
          </div>

          <div *ngIf="setlistStatus" class="mt-4 p-3.5 rounded-xl text-xs"
               [ngClass]="setlistStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (setlistStatus.inProgress ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')">
            <div class="flex items-center justify-between mb-1">
              <span class="font-semibold">{{ setlistStatus.inProgress ? 'Syncing to PDS...' : (setlistStatus.success ? 'Sync Complete' : 'Sync Error') }}</span>
              <span class="font-mono">{{ setlistStatus.processed }} / {{ setlistStatus.total }}</span>
            </div>
            <div *ngIf="setlistStatus.inProgress" class="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div class="bg-emerald-400 h-1.5 transition-all duration-200" [style.width.%]="(setlistStatus.processed / (setlistStatus.total || 1)) * 100"></div>
            </div>
            <p *ngIf="setlistStatus.errorMessage" class="text-[11px] text-rose-300 mt-1">
              {{ setlistStatus.errorMessage }}
            </p>
          </div>
        </div>

      </div>

    </div>
  `
})
export class ImportersComponent implements OnInit {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);
  metadataService = inject(DirectMetadataService);

  isImporting = false;

  setlistUserId = '';
  setlistApiKey = '';

  storygraphStatus?: ImportTaskStatus;
  letterboxdStatus?: ImportTaskStatus;
  setlistStatus?: ImportTaskStatus;

  ngOnInit() {
    this.setlistUserId = this.metadataService.getSetlistUserId();
    this.setlistApiKey = this.metadataService.getSetlistApiKey();
  }

  onSetlistCredentialsChange() {
    this.metadataService.setSetlistUserId(this.setlistUserId);
    this.metadataService.setSetlistApiKey(this.setlistApiKey);
  }

  onStorygraphFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.parseStoryGraphCsv(file);
    }
  }

  onLetterboxdFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.parseLetterboxdCsv(file);
    }
  }

  async syncSetlistFm() {
    if (!this.setlistUserId.trim() || !this.setlistApiKey.trim() || !this.auth.isAuthenticated()) return;
    
    this.onSetlistCredentialsChange();
    this.isImporting = true;
    this.setlistStatus = { source: 'setlist.fm', total: 0, processed: 0, inProgress: true, success: false };

    try {
      let page = 1;
      let totalConcerts = 0;
      let totalPages = 1;

      while (page <= totalPages) {
        const res = await this.metadataService.fetchSetlistFmPage(this.setlistUserId, this.setlistApiKey, page);
        if (!res || !res.setlist) break;

        totalConcerts = res.total || res.setlist.length;
        const itemsPerPage = res.itemsPerPage || 20;
        totalPages = Math.ceil(totalConcerts / itemsPerPage);
        this.setlistStatus.total = totalConcerts;

        for (const concert of res.setlist) {
          try {
            const artist = concert.artist?.name || 'Unknown Artist';
            const venue = concert.venue?.name || 'Venue';
            const city = concert.venue?.city?.name || '';
            const country = concert.venue?.city?.country?.name || '';
            const rawDate = concert.eventDate || ''; // "23-08-2024"
            const url = concert.url || '';
            const setlistId = concert.id || '';

            // Format date to ISO
            let isoDate: string | undefined = undefined;
            if (rawDate && rawDate.includes('-')) {
              const [d, m, y] = rawDate.split('-');
              isoDate = `${y}-${m}-${d}T00:00:00Z`;
            }

            const title = `${artist} @ ${venue}`;
            const mediaId = `setlist:${setlistId}`;

            await this.repo.createLog({
              mediaType: 'concert',
              title: title,
              status: 'completed',
              completedAt: isoDate,
              mediaItemId: mediaId,
              metadataJson: {
                artist: artist,
                venue: venue,
                city: city,
                country: country,
                setlist_url: url
              }
            });

            this.setlistStatus.processed++;
          } catch (itemErr) {
            console.warn('Error saving concert setlist to PDS:', itemErr);
          }
        }

        page++;
      }

      this.setlistStatus.inProgress = false;
      this.setlistStatus.success = true;
      await this.repo.syncFromPds();
    } catch (err: any) {
      console.error('Failed to sync setlist.fm:', err);
      this.setlistStatus.inProgress = false;
      this.setlistStatus.errorMessage = err?.message || 'Failed to connect to setlist.fm. Please verify your credentials.';
    } finally {
      this.isImporting = false;
    }
  }

  private parseStoryGraphCsv(file: File) {
    this.isImporting = true;
    this.storygraphStatus = { source: 'StoryGraph', total: 0, processed: 0, inProgress: true, success: false };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        this.storygraphStatus!.total = rows.length;

        for (const row of rows) {
          try {
            const title = row['Title'] || row['title'];
            if (!title) continue;

            const author = row['Authors'] || row['Author'] || '';
            const isbn = row['ISBN/UID'] || '';
            const statusRaw = (row['Read Status'] || '').toLowerCase();
            
            let status = 'completed';
            if (statusRaw.includes('to-read') || statusRaw.includes('wishlist')) {
              status = 'want_to_consume';
            } else if (statusRaw.includes('currently-reading')) {
              status = 'consuming';
            }

            const rating = row['Star Rating'] ? Math.round(parseFloat(row['Star Rating'])) : undefined;
            const review = row['Review'] || undefined;
            const dateRead = row['Last Date Read'] || row['Date Added'] || undefined;

            await this.repo.createLog({
              mediaType: 'book',
              title: title.trim(),
              status: status,
              rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
              review: review,
              completedAt: dateRead ? new Date(dateRead).toISOString() : undefined,
              metadataJson: {
                author: author,
                isbn: isbn
              }
            });

            this.storygraphStatus!.processed++;
          } catch (err) {
            console.warn('Error importing row:', err);
          }
        }

        this.storygraphStatus!.inProgress = false;
        this.storygraphStatus!.success = true;
        this.isImporting = false;
        await this.repo.syncFromPds();
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        this.storygraphStatus!.inProgress = false;
        this.storygraphStatus!.errorMessage = err.message;
        this.isImporting = false;
      }
    });
  }

  private parseLetterboxdCsv(file: File) {
    this.isImporting = true;
    this.letterboxdStatus = { source: 'Letterboxd', total: 0, processed: 0, inProgress: true, success: false };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        this.letterboxdStatus!.total = rows.length;

        for (const row of rows) {
          try {
            const title = row['Name'] || row['Title'] || '';
            if (!title) continue;

            const year = row['Year'] || '';
            const letterboxdUri = row['Letterboxd URI'] || '';
            const rating = row['Rating'] ? Math.round(parseFloat(row['Rating'])) : undefined;
            const dateWatched = row['Watched Date'] || row['Date'] || undefined;

            let status = 'completed';
            if (file.name.toLowerCase().includes('watchlist')) {
              status = 'want_to_consume';
            }

            await this.repo.createLog({
              mediaType: 'movie',
              title: title.trim(),
              status: status,
              rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
              completedAt: dateWatched ? new Date(dateWatched).toISOString() : undefined,
              metadataJson: {
                year: year,
                letterboxd_url: letterboxdUri
              }
            });

            this.letterboxdStatus!.processed++;
          } catch (err) {
            console.warn('Error importing row:', err);
          }
        }

        this.letterboxdStatus!.inProgress = false;
        this.letterboxdStatus!.success = true;
        this.isImporting = false;
        await this.repo.syncFromPds();
      }
    });
  }
}
