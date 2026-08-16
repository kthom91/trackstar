import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  getAllProviders,
  IntegrationProvider,
  parseCsvAuto,
  NormalizedMediaEntry
} from '@trackstar/integrations';
import { PdsRepositoryService } from '../../services/pds-repo.service';
import { PdsAuthService } from '../../services/pds-auth.service';

export interface ImportTaskStatus {
  source: string;
  total: number;
  processed: number;
  inProgress: boolean;
  success: boolean;
  errorMessage?: string;
  detectedProvider?: string;
}

@Component({
  selector: 'app-importers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 max-w-5xl mx-auto">
      
      <!-- Page Header -->
      <div class="hidden nav:block space-y-1 border-b border-[rgba(14,14,14,0.14)] pb-3">
        <h1 class="text-2xl sm:text-3xl font-serif font-bold text-[#0e0e0e] tracking-tight">Direct Importers</h1>
        <p class="text-xs font-mono text-[#9a8f7e]">
          Import your historical media logs from CSV exports directly into your personal AT Protocol repository.
        </p>
      </div>

      <!-- Auth Warning if not signed in -->
      <div *ngIf="!auth.isAuthenticated()" class="bg-[#faf7f2] border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div class="flex items-center space-x-3">
          <span class="text-xl">⚠️</span>
          <div>
            <h4 class="font-serif font-bold text-[#0e0e0e] text-sm">PDS Account Required for Import</h4>
            <p class="text-xs font-mono text-[#9a8f7e]">Connect your Personal Data Server account before running importers.</p>
          </div>
        </div>
      </div>

      <!-- Smart Universal Dropzone (Auto-detects format) -->
      <div class="bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-2xl p-6 sm:p-7 shadow-sm hover:border-[#0e0e0e] transition-all">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 rounded-md bg-[#0e0e0e] text-[#f0ede6] text-[10px] font-mono font-bold tracking-wider uppercase">Auto-Detect</span>
              <h3 class="text-base font-serif font-bold text-[#0e0e0e]">Smart CSV Ingest</h3>
            </div>
            <p class="text-xs font-mono text-[#9a8f7e] mt-1">
              Drop any Letterboxd, StoryGraph, or Goodreads export CSV. Format and media type are detected automatically.
            </p>
          </div>

          <span class="font-mono text-xs text-[#9a8f7e] shrink-0">
            Supported: LB, SG, GR
          </span>
        </div>

        <div class="border-2 border-dashed border-[rgba(14,14,14,0.24)] hover:border-[#0e0e0e] rounded-xl p-8 text-center cursor-pointer transition-colors relative bg-white/70">
          <input type="file" 
                 accept=".csv"
                 [disabled]="!auth.isAuthenticated() || isImporting"
                 (change)="onAutoDetectFileSelected($event)" 
                 class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
          <svg class="w-8 h-8 text-[#0e0e0e] mx-auto mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <p class="text-xs font-mono font-bold text-[#0e0e0e]">Choose CSV or drag & drop here</p>
          <p class="text-[11px] font-mono text-[#9a8f7e] mt-1">diary.csv, watched.csv, watchlist.csv, storygraph_export.csv, goodreads_library_export.csv</p>
        </div>

        <!-- Progress / Status for Auto Ingest -->
        <div *ngIf="autoImportStatus" class="mt-4 p-3.5 rounded-xl text-xs font-mono"
             [ngClass]="autoImportStatus.success ? 'bg-emerald-500/10 text-emerald-950 border border-emerald-500/30' : (autoImportStatus.inProgress ? 'bg-[#f0ede6] text-[#0e0e0e] border border-[rgba(14,14,14,0.24)]' : 'bg-rose-500/10 text-rose-950 border border-rose-500/30')">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold">
              {{ autoImportStatus.inProgress ? 'Importing ' + autoImportStatus.source + ' to PDS...' : (autoImportStatus.success ? '✓ ' + autoImportStatus.source + ' Import Complete' : 'Import Error') }}
            </span>
            <span>{{ autoImportStatus.processed }} / {{ autoImportStatus.total }}</span>
          </div>
          <div *ngIf="autoImportStatus.inProgress" class="w-full bg-[rgba(14,14,14,0.14)] rounded-full h-1.5 overflow-hidden">
            <div class="bg-[#0e0e0e] h-1.5 transition-all duration-200" [style.width.%]="(autoImportStatus.processed / (autoImportStatus.total || 1)) * 100"></div>
          </div>
          <p *ngIf="autoImportStatus.errorMessage" class="text-rose-700 text-[11px] mt-1.5">
            {{ autoImportStatus.errorMessage }}
          </p>
        </div>
      </div>

      <!-- Specific Provider Cards Grid -->
      <div class="space-y-4">
        <h3 class="text-xs font-mono font-bold uppercase tracking-widest text-[#9a8f7e]">Individual Integrations</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div *ngFor="let provider of csvProviders" 
               class="bg-[#faf7f2] rounded-2xl p-6 border border-[rgba(14,14,14,0.24)] flex flex-col justify-between shadow-sm hover:border-[#0e0e0e] transition-all">
            <div>
              <!-- Header -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-xl bg-[#0e0e0e] text-[#f0ede6] flex items-center justify-center font-bold text-base shadow-sm font-mono shrink-0">
                    {{ provider.avatarText }}
                  </div>
                  <div>
                    <h3 class="text-base font-serif font-bold text-[#0e0e0e]">{{ provider.name }}</h3>
                    <span class="text-[10px] font-mono uppercase tracking-wider text-[#9a8f7e]">{{ provider.category }}</span>
                  </div>
                </div>

                <a *ngIf="provider.exportGuideUrl" 
                   [href]="provider.exportGuideUrl" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   title="Open export page in new tab"
                   class="text-[11px] font-mono text-[#9a8f7e] hover:text-[#0e0e0e] underline decoration-dotted">
                  Export ↗
                </a>
              </div>

              <!-- Instructions -->
              <p class="text-xs font-mono text-[#3d3830] mb-4 bg-[#f0ede6] p-3 rounded-xl border border-[rgba(14,14,14,0.14)] leading-relaxed">
                {{ provider.description }}
              </p>

              <!-- Upload Button Area -->
              <div class="border-2 border-dashed border-[rgba(14,14,14,0.24)] hover:border-[#0e0e0e] rounded-xl p-5 text-center cursor-pointer transition-colors relative bg-white/60">
                <input type="file" 
                       accept=".csv"
                       [disabled]="!auth.isAuthenticated() || isImporting"
                       (change)="onProviderFileSelected(provider, $event)" 
                       class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                <svg class="w-6 h-6 text-[#0e0e0e] mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <span class="text-xs font-mono text-[#3d3830]">Upload {{ provider.name }} CSV</span>
              </div>
            </div>

            <!-- Provider Status -->
            <div *ngIf="statusMap[provider.id] as status" class="mt-4 p-3 rounded-xl text-xs font-mono"
                 [ngClass]="status.success ? 'bg-emerald-500/10 text-emerald-950 border border-emerald-500/30' : (status.inProgress ? 'bg-[#f0ede6] text-[#0e0e0e] border border-[rgba(14,14,14,0.24)]' : 'bg-rose-500/10 text-rose-950 border border-rose-500/30')">
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold">{{ status.inProgress ? 'Importing to PDS...' : (status.success ? '✓ Complete' : 'Error') }}</span>
                <span>{{ status.processed }} / {{ status.total }}</span>
              </div>
              <div *ngIf="status.inProgress" class="w-full bg-[rgba(14,14,14,0.14)] rounded-full h-1.5 overflow-hidden">
                <div class="bg-[#0e0e0e] h-1.5 transition-all duration-200" [style.width.%]="(status.processed / (status.total || 1)) * 100"></div>
              </div>
              <p *ngIf="status.errorMessage" class="text-rose-700 text-[10px] mt-1">{{ status.errorMessage }}</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  `
})
export class ImportersComponent {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);

  readonly csvProviders: IntegrationProvider[] = getAllProviders().filter(p =>
    p.capabilities.includes('csv_import')
  );

  isImporting = false;
  autoImportStatus?: ImportTaskStatus;
  statusMap: Record<string, ImportTaskStatus> = {};

  async onAutoDetectFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      await this.runAutoImport(file);
    }
  }

  async onProviderFileSelected(provider: IntegrationProvider, event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      await this.runProviderImport(provider, file);
    }
  }

  private async runAutoImport(file: File): Promise<void> {
    this.isImporting = true;
    this.autoImportStatus = {
      source: 'CSV File',
      total: 0,
      processed: 0,
      inProgress: true,
      success: false
    };

    try {
      const parsed = await parseCsvAuto(file, {
        filename: file.name
      });

      this.autoImportStatus.source = parsed.sourceName;
      this.autoImportStatus.total = parsed.entries.length;

      await this.ingestEntries(parsed.entries, (processed, total) => {
        if (this.autoImportStatus) {
          this.autoImportStatus.processed = processed;
        }
      });

      this.autoImportStatus.inProgress = false;
      this.autoImportStatus.success = true;
    } catch (err: any) {
      console.error('Auto import error:', err);
      this.autoImportStatus.inProgress = false;
      this.autoImportStatus.errorMessage = err.message || 'Failed to parse CSV file.';
    } finally {
      this.isImporting = false;
      await this.repo.syncFromPds();
    }
  }

  private async runProviderImport(provider: IntegrationProvider, file: File): Promise<void> {
    if (!provider.parseCsv) return;

    this.isImporting = true;
    const status: ImportTaskStatus = {
      source: provider.name,
      total: 0,
      processed: 0,
      inProgress: true,
      success: false
    };
    this.statusMap[provider.id] = status;

    try {
      const parsed = await provider.parseCsv(file, {
        filename: file.name
      });

      status.total = parsed.entries.length;

      await this.ingestEntries(parsed.entries, (processed, total) => {
        status.processed = processed;
      });

      status.inProgress = false;
      status.success = true;
    } catch (err: any) {
      console.error(`Import error for ${provider.name}:`, err);
      status.inProgress = false;
      status.errorMessage = err.message || 'Failed to import file.';
    } finally {
      this.isImporting = false;
      await this.repo.syncFromPds();
    }
  }

  private async ingestEntries(
    entries: NormalizedMediaEntry[],
    onProgress: (processed: number, total: number) => void
  ): Promise<void> {
    let count = 0;
    for (const entry of entries) {
      try {
        await this.repo.createLog({
          mediaType: entry.mediaType,
          title: entry.title,
          status: entry.status,
          rating: entry.rating,
          review: entry.review,
          completedAt: entry.completedAt,
          loggedAt: entry.loggedAt,
          source: entry.source,
          metadataJson: entry.metadata
        });
      } catch (e) {
        console.warn('Failed to ingest entry:', entry.title, e);
      } finally {
        count++;
        onProgress(count, entries.length);
      }
    }
  }
}
