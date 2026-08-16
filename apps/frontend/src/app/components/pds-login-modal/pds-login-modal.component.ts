import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdsAuthService } from '../../services/pds-auth.service';
import { PdsRepositoryService } from '../../services/pds-repo.service';
import { DirectMetadataService } from '../../services/direct-metadata.service';

@Component({
  selector: 'app-pds-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e0e0e]/40 backdrop-blur-xs animate-fadeIn">
      <div class="bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl text-[#0e0e0e]">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-[rgba(14,14,14,0.14)]">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl bg-[#0e0e0e] flex items-center justify-center text-[#f0ede6] font-bold text-xs shadow-sm">
              t*
            </div>
            <div>
              <h3 class="text-xl font-serif font-bold text-[#0e0e0e]">
                {{ auth.isAuthenticated() ? 'AT Protocol Account' : 'Connect Your PDS' }}
              </h3>
              <p class="text-[11px] font-mono text-[#9a8f7e]">
                {{ auth.isAuthenticated() ? 'Connected to personal data repository' : 'Authenticate with your personal data server' }}
              </p>
            </div>
          </div>
          <button (click)="close.emit()" class="text-[#9a8f7e] hover:text-[#0e0e0e] transition-colors p-1.5 rounded-lg hover:bg-[#0e0e0e]/5">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- If Already Connected -->
        <div *ngIf="auth.isAuthenticated()" class="space-y-4">
          <div class="bg-[#f0ede6] border border-[rgba(14,14,14,0.14)] rounded-xl p-4 space-y-2 font-mono text-xs">
            <div class="flex items-center justify-between">
              <span class="text-[#3d3830]">Connected Handle</span>
              <span class="font-bold text-[#0e0e0e]">{{ auth.currentHandle() }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[#3d3830]">User DID</span>
              <span class="text-[11px] text-[#9a8f7e] truncate max-w-[200px]" [title]="auth.currentDid()">
                {{ auth.currentDid() }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[#3d3830]">PDS Server</span>
              <span class="text-[#9a8f7e]">{{ auth.currentPdsUrl() }}</span>
            </div>
          </div>

          <!-- TMDB API Key Settings -->
          <div class="space-y-1.5 pt-2 border-t border-[rgba(14,14,14,0.14)]">
            <div class="flex items-center justify-between font-mono text-xs">
              <label class="font-bold uppercase text-[10px] text-[#3d3830] tracking-wider">TMDB API Key (Optional)</label>
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#0e0e0e] hover:underline">Get Key ↗</a>
            </div>
            <input type="text" 
                   [(ngModel)]="tmdbKey" 
                   (ngModelChange)="onTmdbKeyChange()"
                   placeholder="Enter your free TMDB API key for movie posters" 
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] font-mono placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            <p class="text-[10px] font-mono text-[#9a8f7e]">Stored locally in your browser to enrich movie cover art.</p>
          </div>

          <!-- Last.fm API Key Settings -->
          <div class="space-y-1.5 pt-2 border-t border-[rgba(14,14,14,0.14)]">
            <div class="flex items-center justify-between font-mono text-xs">
              <label class="font-bold uppercase text-[10px] text-[#3d3830] tracking-wider">Last.fm API Key (Optional)</label>
              <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#0e0e0e] hover:underline">Get Key ↗</a>
            </div>
            <input type="text" 
                   [(ngModel)]="lastfmKey" 
                   (ngModelChange)="onLastfmKeyChange()"
                   placeholder="Enter your free Last.fm API key for band pictures" 
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] font-mono placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            <p class="text-[10px] font-mono text-[#9a8f7e]">Stored locally in your browser to enrich concert and band artwork.</p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-[rgba(14,14,14,0.14)] gap-2 font-mono text-xs">
            <button (click)="syncPds()" [disabled]="repo.loading()"
                    class="px-3.5 py-2 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-xl font-semibold shadow-sm transition-all">
              {{ repo.loading() ? 'Syncing...' : 'Sync Records' }}
            </button>
            <div class="flex items-center space-x-2">
              <button (click)="startReauth()"
                      class="px-3 py-2 bg-white hover:bg-neutral-100 text-[#3d3830] border border-[rgba(14,14,14,0.24)] rounded-xl transition-all">
                Re-authenticate
              </button>
              <button (click)="logout()" 
                      class="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 border border-rose-500/30 rounded-xl transition-all">
                Disconnect
              </button>
            </div>
          </div>
        </div>

        <!-- Login Form -->
        <form *ngIf="!auth.isAuthenticated()" (ngSubmit)="handleLogin()" class="space-y-4">
          
          <!-- Server Presets -->
          <div class="space-y-1.5 font-mono text-xs">
            <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">PDS Server Presets</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" 
                      (click)="setPdsPreset('http://localhost:3000')"
                      [ngClass]="pdsUrl === 'http://localhost:3000' ? 'bg-[#0e0e0e] border-[#0e0e0e] text-[#f0ede6] font-bold' : 'bg-white border-[rgba(14,14,14,0.24)] text-[#3d3830]'"
                      class="px-3 py-2 rounded-xl border text-left transition-all">
                🖥️ Local (:3000)
              </button>
              <button type="button" 
                      (click)="setPdsPreset('https://bsky.social')"
                      [ngClass]="pdsUrl === 'https://bsky.social' ? 'bg-[#0e0e0e] border-[#0e0e0e] text-[#f0ede6] font-bold' : 'bg-white border-[rgba(14,14,14,0.24)] text-[#3d3830]'"
                      class="px-3 py-2 rounded-xl border text-left transition-all">
                🦋 Bluesky (bsky)
              </button>
            </div>
          </div>

          <!-- PDS URL -->
          <div class="space-y-1 font-mono text-xs">
            <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">PDS Endpoint</label>
            <input type="url" 
                   [(ngModel)]="pdsUrl" 
                   name="pdsUrl" 
                   required
                   placeholder="http://localhost:3000"
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
          </div>

          <!-- Identifier -->
          <div class="space-y-1 font-mono text-xs">
            <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">Handle or Email</label>
            <input type="text" 
                   [(ngModel)]="identifier" 
                   name="identifier" 
                   required
                   placeholder="user123.trackstar.test or alice.bsky.social"
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
          </div>

          <!-- Password / App Password -->
          <div class="space-y-1 font-mono text-xs">
            <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">Password / App Password</label>
            <input type="password" 
                   [(ngModel)]="password" 
                   name="password" 
                   required
                   placeholder="••••••••••••"
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            <p class="text-[10px] text-[#9a8f7e]">For Bluesky accounts, use an App Password generated in Settings &gt; App Passwords.</p>
          </div>

          <!-- Error Message -->
          <div *ngIf="errorMessage" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl font-mono text-xs text-rose-900">
            {{ errorMessage }}
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button type="submit" 
                    [disabled]="submitting || !identifier || !password"
                    class="w-full py-2.5 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-40 text-[#f0ede6] font-mono font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2">
              <div *ngIf="submitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ submitting ? 'Connecting to PDS...' : 'Connect to PDS' }}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  `
})
export class PdsLoginModalComponent {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);
  metadata = inject(DirectMetadataService);

  close = output<void>();

  pdsUrl = 'http://localhost:3000';
  identifier = 'user123.trackstar.test';
  password = 'password123';

  tmdbKey = this.metadata.getTmdbApiKey();
  lastfmKey = this.metadata.getLastfmApiKey();
  submitting = false;
  errorMessage: string | null = null;

  setPdsPreset(url: string) {
    this.pdsUrl = url;
    if (url === 'https://bsky.social') {
      this.identifier = '';
      this.password = '';
    } else {
      this.identifier = 'user123.trackstar.test';
      this.password = 'password123';
    }
  }

  onTmdbKeyChange() {
    this.metadata.setTmdbApiKey(this.tmdbKey);
    if (this.tmdbKey.trim()) {
      this.repo.enrichMissingMetadata();
    }
  }

  onLastfmKeyChange() {
    this.metadata.setLastfmApiKey(this.lastfmKey);
    if (this.lastfmKey.trim()) {
      this.repo.enrichMissingMetadata();
    }
  }

  async handleLogin() {
    this.submitting = true;
    this.errorMessage = null;

    try {
      await this.auth.login(this.pdsUrl, this.identifier, this.password);
      await this.repo.syncFromPds();
      this.close.emit();
    } catch (err: any) {
      console.error('Login error:', err);
      this.errorMessage = err?.message || 'Invalid credentials or PDS unreachable.';
    } finally {
      this.submitting = false;
    }
  }

  async syncPds() {
    await this.repo.syncFromPds();
  }

  startReauth() {
    const s = this.auth.session();
    if (s) {
      this.pdsUrl = s.pdsUrl || 'http://localhost:3000';
      this.identifier = s.handle || 'user123.trackstar.test';
    }
    this.auth.logout();
  }

  logout() {
    this.auth.logout();
  }
}
