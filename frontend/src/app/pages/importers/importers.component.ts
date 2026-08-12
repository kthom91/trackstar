import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, SyncJob } from '../../services/api.service';

@Component({
  selector: 'app-importers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">Import & Sync Center</h1>
        <p class="text-gray-400 text-sm mt-1">Import your historical media data from external services or trigger manual background syncs.</p>
      </div>

      <!-- Importers Grid: 3 Equal Columns on Desktop -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        <!-- StoryGraph CSV Importer -->
        <div class="glass-card rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white font-['Outfit']">StoryGraph Importer</h3>
                <p class="text-xs text-gray-400">Import books via StoryGraph CSV export file</p>
              </div>
            </div>

            <p class="text-xs text-gray-300 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
              Maps statuses (<code class="text-teal-300">read</code>, <code class="text-teal-300">currently-reading</code>, <code class="text-teal-300">to-read</code>), star ratings, dates, and enriches metadata via Open Library.
            </p>

            <div class="border-2 border-dashed border-white/20 hover:border-teal-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative bg-white/5">
              <input type="file" 
                     accept=".csv"
                     (change)="onStorygraphFileSelected($event)" 
                     class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <svg class="w-8 h-8 text-teal-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <span class="text-xs font-medium text-gray-300">Choose StoryGraph CSV or drag & drop</span>
            </div>
          </div>

          <div *ngIf="storygraphJob" class="mt-4 p-3 rounded-xl text-xs flex items-center justify-between"
               [class]="storygraphJob.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'">
            <span>Status: {{ storygraphJob.status }} ({{ storygraphJob.records_processed }} processed)</span>
          </div>
        </div>

        <!-- Letterboxd CSV / RSS Importer -->
        <div class="glass-card rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white font-['Outfit']">Letterboxd Importer</h3>
                <p class="text-xs text-gray-400">Import movies via CSV export or RSS feed</p>
              </div>
            </div>

            <p class="text-xs text-gray-300 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
              Upload <code class="text-indigo-300">diary.csv</code> or <code class="text-indigo-300">watchlist.csv</code>. Enriches movies with TMDB posters, ratings, dates, and direct Letterboxd URIs.
            </p>


            <div class="space-y-3">
              <div class="border-2 border-dashed border-white/20 hover:border-orange-500/50 rounded-xl p-3.5 text-center cursor-pointer transition-colors relative bg-white/5">
                <input type="file" 
                       accept=".csv"
                       (change)="onLetterboxdFileSelected($event)" 
                       class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <span class="text-xs font-medium text-gray-300">Upload Letterboxd CSV</span>
              </div>

              <button (click)="triggerLetterboxdRss()"
                      class="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition-colors shadow-lg shadow-orange-600/20">
                Poll Letterboxd RSS Feed
              </button>
            </div>
          </div>

          <div *ngIf="letterboxdJob" class="mt-4 p-3 rounded-xl text-xs flex items-center justify-between"
               [class]="letterboxdJob.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'">
            <span>Status: {{ letterboxdJob.status }} ({{ letterboxdJob.records_processed }} processed)</span>
          </div>
        </div>

        <!-- setlist.fm Concert Connector -->
        <div class="glass-card rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white font-['Outfit']">setlist.fm Connector</h3>
                <p class="text-xs text-gray-400">Sync live concert attendance history</p>
              </div>
            </div>


            <p class="text-xs text-gray-300 mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
              Syncs attended concerts, dates, venues, setlists, and band artwork automatically from setlist.fm.
            </p>

            <button (click)="triggerSetlistFmSync()"
                    [disabled]="isSetlistSyncing"
                    class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2">
              <svg *ngIf="isSetlistSyncing" class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>{{ isSetlistSyncing ? 'Syncing Concerts...' : 'Sync Attended Concerts' }}</span>
            </button>
          </div>

          <div *ngIf="setlistJob" class="mt-4 p-3 rounded-xl text-xs flex items-center justify-between"
               [class]="setlistJob.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'">
            <span>Status: {{ setlistJob.status }} ({{ setlistJob.records_processed }} processed)</span>
          </div>
        </div>

      </div>

      <!-- Sync Job History Table -->
      <div class="glass-card rounded-2xl p-6 border border-white/10">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white font-['Outfit']">Sync & Import Execution History</h2>
          <button (click)="loadSyncJobs()" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
            Refresh Status
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th class="py-3 px-4">Connector</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Records</th>
                <th class="py-3 px-4">Triggered At</th>
                <th class="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr *ngFor="let job of jobs" class="hover:bg-white/5 transition-colors">
                <td class="py-3.5 px-4 font-medium text-white capitalize">
                  {{ job.connector_name.replace('_', ' ') }}
                </td>
                <td class="py-3.5 px-4">
                  <span [class]="getJobBadgeClass(job.status)" class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                    {{ job.status }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-gray-300 font-mono">{{ job.records_processed }}</td>
                <td class="py-3.5 px-4 text-gray-400 text-xs">{{ job.triggered_at | date:'medium' }}</td>
                <td class="py-3.5 px-4 text-gray-400 text-xs truncate max-w-xs">
                  {{ job.error_message || 'OK' }}
                </td>
              </tr>
              <tr *ngIf="jobs.length === 0">
                <td colspan="5" class="py-8 text-center text-gray-500">No sync jobs have run yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class ImportersComponent implements OnInit {
  private api = inject(ApiService);

  jobs: SyncJob[] = [];
  storygraphJob?: SyncJob;
  letterboxdJob?: SyncJob;
  setlistJob?: SyncJob;

  isSetlistSyncing = false;

  ngOnInit() {
    this.loadSyncJobs();
  }

  loadSyncJobs() {
    this.api.getSyncJobs().subscribe({
      next: (data) => this.jobs = data,
      error: (err) => console.error('Failed to load sync jobs:', err)
    });
  }

  onStorygraphFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.api.uploadStorygraphCsv(file).subscribe({
        next: (job) => {
          this.storygraphJob = job;
          this.loadSyncJobs();
        },
        error: (err) => console.error('StoryGraph upload error:', err)
      });
    }
  }

  onLetterboxdFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.api.uploadLetterboxdCsv(file).subscribe({
        next: (job) => {
          this.letterboxdJob = job;
          this.loadSyncJobs();
        },
        error: (err) => console.error('Letterboxd upload error:', err)
      });
    }
  }

  triggerLetterboxdRss() {
    this.api.pollLetterboxdRss().subscribe({
      next: (job) => {
        this.letterboxdJob = job;
        this.loadSyncJobs();
      },
      error: (err) => console.error('Letterboxd RSS error:', err)
    });
  }

  triggerSetlistFmSync() {
    this.isSetlistSyncing = true;
    this.api.syncSetlistFm().subscribe({
      next: (job) => {
        this.setlistJob = job;
        this.isSetlistSyncing = false;
        this.loadSyncJobs();
      },
      error: (err) => {
        console.error('setlist.fm sync error:', err);
        this.isSetlistSyncing = false;
      }
    });
  }

  getJobBadgeClass(status: string): string {
    switch (status) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'running': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse';
      case 'failed': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  }
}
